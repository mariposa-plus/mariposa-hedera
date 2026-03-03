import { spawn, execFile, ChildProcess } from 'child_process';
import http from 'http';
import { completeOAuthLoginHeadless } from './creHeadlessBrowser.service';

const CRE_CLI_PATH = process.env.CRE_CLI_PATH || 'cre';
const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL || 'https://backend.mariposa.plus';
const STALE_SESSION_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // 60 seconds

interface LoginSession {
  process: ChildProcess;
  port: number;
  originalAuthUrl: string;
  modifiedAuthUrl: string;
  pipelineId?: string;
  createdAt: number;
}

class CREAuthService {
  private session: LoginSession | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start stale session cleanup interval
    this.cleanupTimer = setInterval(() => this.cleanupStaleSessions(), CLEANUP_INTERVAL_MS);
  }

  /**
   * Spawn `cre login`, parse stdout for the auth URL and callback port.
   * Rewrites redirect_uri to point to our backend proxy.
   */
  async startLogin(pipelineId?: string): Promise<{
    originalAuthUrl: string;
    modifiedAuthUrl: string;
    port: number;
    sessionId: string;
  }> {
    // Kill any existing login process
    this.killCurrentSession();

    return new Promise((resolve, reject) => {
      const child = spawn(CRE_CLI_PATH, ['login'], {
        shell: true,
        env: { ...process.env, BROWSER: 'none' },
      });

      let resolved = false;
      let stdoutBuffer = '';
      let stderrBuffer = '';

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          child.kill('SIGTERM');
          this.session = null;
          reject(new Error('Timed out waiting for auth URL from cre login'));
        }
      }, 30000);

      const handleUrl = (authUrl: string) => {
        if (resolved) return;

        // Extract callback port from redirect_uri parameter
        const redirectMatch = authUrl.match(/redirect_uri=([^&]+)/);
        let port = 0;
        if (redirectMatch) {
          try {
            const redirectUri = decodeURIComponent(redirectMatch[1]);
            const portMatch = redirectUri.match(/:(\d+)/);
            if (portMatch) {
              port = parseInt(portMatch[1], 10);
            }
          } catch {}
        }

        // Rewrite redirect_uri to point to our backend
        const backendRedirectUri = `${BACKEND_PUBLIC_URL}/api/cre/auth/oauth-redirect`;
        let modifiedAuthUrl = authUrl;
        if (redirectMatch) {
          modifiedAuthUrl = authUrl.replace(
            /redirect_uri=[^&]+/,
            `redirect_uri=${encodeURIComponent(backendRedirectUri)}`
          );
        }

        const sessionId = `cre-${Date.now()}`;

        this.session = {
          process: child,
          port,
          originalAuthUrl: authUrl,
          modifiedAuthUrl,
          pipelineId,
          createdAt: Date.now(),
        };

        resolved = true;
        clearTimeout(timeout);
        resolve({
          originalAuthUrl: authUrl,
          modifiedAuthUrl,
          port,
          sessionId,
        });
      };

      child.stdout?.on('data', (data: Buffer) => {
        stdoutBuffer += data.toString();
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          const urlMatch = trimmed.match(/(https?:\/\/login\.chain\.link\/authorize[^\s"']+)/);
          if (urlMatch) {
            handleUrl(urlMatch[1]);
          }
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        stderrBuffer += output;
        const urlMatch = output.match(/(https?:\/\/login\.chain\.link\/authorize[^\s"']+)/);
        if (urlMatch) {
          handleUrl(urlMatch[1]);
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          this.session = null;
          reject(new Error(`Failed to start cre login: ${error.message}`));
        }
      });

      child.on('close', (code) => {
        if (!resolved) {
          // Check stdoutBuffer for a remaining URL (may lack trailing newline)
          const remainingUrl = stdoutBuffer.trim().match(/(https?:\/\/login\.chain\.link\/authorize[^\s"']+)/);
          if (remainingUrl) {
            handleUrl(remainingUrl[1]);
            return;
          }

          resolved = true;
          clearTimeout(timeout);
          this.session = null;
          const stderrMsg = stderrBuffer.trim();
          const details = stderrMsg ? `\nstderr: ${stderrMsg}` : '';
          const stdoutMsg = stdoutBuffer.trim();
          const stdoutDetails = stdoutMsg ? `\nstdout (remaining): ${stdoutMsg}` : '';
          reject(new Error(`cre login exited with code ${code} before producing auth URL${details}${stdoutDetails}`));
        }
      });
    });
  }

  /**
   * Run `cre whoami` to check if authenticated
   */
  async checkStatus(): Promise<{ authenticated: boolean; email?: string }> {
    return new Promise((resolve) => {
      execFile(CRE_CLI_PATH, ['whoami'], { shell: true, timeout: 10000 }, (error, stdout, stderr) => {
        if (error) {
          resolve({ authenticated: false });
          return;
        }

        const output = (stdout || '').trim();
        const emailMatch = output.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          resolve({ authenticated: true, email: emailMatch[1] });
        } else if (output && !output.toLowerCase().includes('not logged in') && !output.toLowerCase().includes('error')) {
          resolve({ authenticated: true, email: output });
        } else {
          resolve({ authenticated: false });
        }
      });
    });
  }

  /**
   * Relay OAuth callback (code + state) from our backend to CRE CLI's localhost server.
   * Used by the GET /auth/oauth-redirect endpoint (auto-redirect flow).
   */
  async relayOAuthCallback(code: string, state: string): Promise<{ success: boolean; message?: string }> {
    if (!this.session) {
      return { success: false, message: 'No active login session. Start login first.' };
    }

    const { port } = this.session;
    if (!port) {
      return { success: false, message: 'No callback port available.' };
    }

    try {
      return new Promise((resolve) => {
        const queryString = `?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
        const req = http.get(
          `http://localhost:${port}/callback${queryString}`,
          { timeout: 10000 },
          (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
              resolve({ success: true });
              // Clean up after successful relay
              setTimeout(() => this.killCurrentSession(), 2000);
            });
          }
        );

        req.on('error', (error) => {
          resolve({ success: false, message: `Failed to relay callback: ${error.message}` });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ success: false, message: 'Callback relay timed out' });
        });
      });
    } catch (error: any) {
      return { success: false, message: `Relay error: ${error.message}` };
    }
  }

  /**
   * Relay the full callback URL to the CRE CLI's localhost callback server.
   * Used by the manual paste flow (POST /auth/callback).
   */
  async relayCallback(callbackUrl: string): Promise<{ success: boolean; message?: string }> {
    if (!this.session) {
      return { success: false, message: 'No active login session. Start login first.' };
    }

    try {
      const url = new URL(callbackUrl);
      const queryString = url.search;
      const path = url.pathname || '/callback';

      return new Promise((resolve) => {
        const req = http.get(
          `http://localhost:${this.session!.port}${path}${queryString}`,
          { timeout: 10000 },
          (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
              resolve({ success: true });
              setTimeout(() => this.killCurrentSession(), 2000);
            });
          }
        );

        req.on('error', (error) => {
          resolve({ success: false, message: `Failed to relay callback: ${error.message}` });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ success: false, message: 'Callback relay timed out' });
        });
      });
    } catch (error: any) {
      return { success: false, message: `Invalid callback URL: ${error.message}` };
    }
  }

  /**
   * Headless login: spawn `cre login`, get the auth URL, then use Puppeteer
   * to complete the OAuth flow on the same machine (localhost redirect works).
   */
  async startHeadlessLogin(email: string, password: string, pipelineId?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    console.log(`[CRE Headless Login] Starting login for email=${email}, pipelineId=${pipelineId || 'none'}`);

    // 1. Spawn `cre login` to get auth URL and localhost callback port
    console.log('[CRE Headless Login] Step 1: Spawning cre login to get auth URL...');
    let originalAuthUrl: string;
    try {
      const loginResult = await this.startLogin(pipelineId);
      originalAuthUrl = loginResult.originalAuthUrl;
      console.log(`[CRE Headless Login] Got auth URL (port=${loginResult.port}): ${originalAuthUrl.substring(0, 80)}...`);
    } catch (err: any) {
      console.error(`[CRE Headless Login] Failed to get auth URL: ${err.message}`);
      throw err;
    }

    // 2. Run headless browser to fill credentials and complete OAuth
    console.log('[CRE Headless Login] Step 2: Launching headless browser...');
    const result = await completeOAuthLoginHeadless(originalAuthUrl, email, password);
    console.log(`[CRE Headless Login] Headless browser result: success=${result.success}${result.error ? `, error=${result.error}` : ''}`);

    // 3. Verify with `cre whoami`
    if (result.success) {
      console.log('[CRE Headless Login] Step 3: Verifying with cre whoami...');
      await new Promise((r) => setTimeout(r, 2000));
      const status = await this.checkStatus();
      console.log(`[CRE Headless Login] whoami result: authenticated=${status.authenticated}, email=${status.email || 'N/A'}`);
      return {
        success: status.authenticated,
        error: status.authenticated ? undefined : 'Auth flow completed but cre whoami failed',
      };
    }

    console.error(`[CRE Headless Login] Login failed: ${result.error}`);
    return result;
  }

  /**
   * Get the active session info (for redirect after OAuth callback)
   */
  getActiveSession(): { pipelineId?: string; port: number } | null {
    if (!this.session) return null;
    return { pipelineId: this.session.pipelineId, port: this.session.port };
  }

  /**
   * Run `cre logout`
   */
  async logout(): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile(CRE_CLI_PATH, ['logout'], { shell: true, timeout: 10000 }, (error) => {
        this.killCurrentSession();

        if (error) {
          reject(new Error(`Failed to logout: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Kill the current login session and its process
   */
  private killCurrentSession(): void {
    if (this.session) {
      try {
        this.session.process.kill('SIGTERM');
      } catch {}
      this.session = null;
    }
  }

  /**
   * Clean up stale sessions (older than 5 minutes)
   */
  private cleanupStaleSessions(): void {
    if (this.session && Date.now() - this.session.createdAt > STALE_SESSION_MS) {
      console.log('Cleaning up stale CRE login session');
      this.killCurrentSession();
    }
  }
}

export const creAuth = new CREAuthService();
