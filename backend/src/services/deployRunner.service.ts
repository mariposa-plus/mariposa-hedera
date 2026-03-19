import { spawn, ChildProcess } from 'child_process';
import Deployment, { IDeployment } from '../models/Deployment';
import { wsService } from './websocket.service';

class DeployRunnerService {
  private activeProcesses = new Map<string, ChildProcess>();
  private logBuffers = new Map<string, string[]>();
  private flushTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Start the full deployment pipeline: install → register → start
   */
  async startDeployment(
    deploymentId: string,
    projectDir: string,
    hcs10Enabled: boolean,
  ): Promise<void> {
    try {
      await Deployment.findByIdAndUpdate(deploymentId, {
        status: 'installing',
        startedAt: new Date(),
      });

      // ── Step 1: npm install ──────────────────────────────
      this.updateStep(deploymentId, 'install', 'running');
      wsService.emitDeployStatus(deploymentId, { status: 'installing' });
      wsService.emitDeployStep(deploymentId, { name: 'install', status: 'running' });

      const installCode = await this.runStep(deploymentId, 'install', 'npm', ['install'], projectDir);

      if (installCode !== 0) {
        this.updateStep(deploymentId, 'install', 'failed', installCode);
        wsService.emitDeployStep(deploymentId, { name: 'install', status: 'failed', exitCode: installCode });
        await this.markFailed(deploymentId, `npm install failed with exit code ${installCode}`);
        return;
      }

      this.updateStep(deploymentId, 'install', 'success', 0);
      wsService.emitDeployStep(deploymentId, { name: 'install', status: 'success', exitCode: 0 });

      // ── Step 2: npm run register-agent (if HCS-10) ──────
      if (hcs10Enabled) {
        await Deployment.findByIdAndUpdate(deploymentId, { status: 'registering' });
        this.updateStep(deploymentId, 'register-agent', 'running');
        wsService.emitDeployStatus(deploymentId, { status: 'registering' });
        wsService.emitDeployStep(deploymentId, { name: 'register-agent', status: 'running' });

        const registerCode = await this.runStep(deploymentId, 'register-agent', 'npm', ['run', 'register-agent'], projectDir);

        if (registerCode !== 0) {
          this.updateStep(deploymentId, 'register-agent', 'failed', registerCode);
          wsService.emitDeployStep(deploymentId, { name: 'register-agent', status: 'failed', exitCode: registerCode });
          await this.markFailed(deploymentId, `npm run register-agent failed with exit code ${registerCode}`);
          return;
        }

        this.updateStep(deploymentId, 'register-agent', 'success', 0);
        wsService.emitDeployStep(deploymentId, { name: 'register-agent', status: 'success', exitCode: 0 });
      }

      // ── Step 3: npm start (long-running) ─────────────────
      await Deployment.findByIdAndUpdate(deploymentId, { status: 'starting' });
      this.updateStep(deploymentId, 'start', 'running');
      wsService.emitDeployStatus(deploymentId, { status: 'starting' });
      wsService.emitDeployStep(deploymentId, { name: 'start', status: 'running' });

      // npm start is long-running — we don't await it to completion normally.
      // Instead, once output appears, we set status to 'running'.
      let hasFirstOutput = false;

      const startCode = await this.runStep(
        deploymentId,
        'start',
        'npm',
        ['start'],
        projectDir,
        (line) => {
          if (!hasFirstOutput) {
            hasFirstOutput = true;
            Deployment.findByIdAndUpdate(deploymentId, { status: 'running' }).catch(() => {});
            wsService.emitDeployStatus(deploymentId, { status: 'running' });
          }
        },
      );

      // If we get here, the start process exited
      if (startCode === 0 || startCode === null) {
        this.updateStep(deploymentId, 'start', 'success', startCode ?? 0);
        wsService.emitDeployStep(deploymentId, { name: 'start', status: 'success', exitCode: startCode ?? 0 });
        await Deployment.findByIdAndUpdate(deploymentId, {
          status: 'stopped',
          finishedAt: new Date(),
        });
        wsService.emitDeployStatus(deploymentId, { status: 'stopped' });
      } else {
        this.updateStep(deploymentId, 'start', 'failed', startCode);
        wsService.emitDeployStep(deploymentId, { name: 'start', status: 'failed', exitCode: startCode });
        await this.markFailed(deploymentId, `Process exited with code ${startCode}`);
      }
    } catch (error: any) {
      await this.markFailed(deploymentId, error.message);
    } finally {
      this.flushLogsNow(deploymentId);
    }
  }

  /**
   * Stop a running deployment — kills the active process
   */
  async stopDeployment(deploymentId: string): Promise<void> {
    const proc = this.activeProcesses.get(deploymentId);
    if (proc) {
      // On Windows, spawn with shell creates a cmd.exe wrapper.
      // We need to kill the process tree.
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(proc.pid), '/f', '/t'], { shell: true });
        } else {
          proc.kill('SIGTERM');
        }
      } catch {}
      this.activeProcesses.delete(deploymentId);
    }

    await Deployment.findByIdAndUpdate(deploymentId, {
      status: 'stopped',
      finishedAt: new Date(),
    });
    wsService.emitDeployStatus(deploymentId, { status: 'stopped' });
    this.flushLogsNow(deploymentId);
  }

  /**
   * Spawn a process and stream its output via WebSocket
   */
  private runStep(
    deploymentId: string,
    stepName: string,
    command: string,
    args: string[],
    cwd: string,
    onOutput?: (line: string) => void,
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      this.emitLog(deploymentId, `$ ${command} ${args.join(' ')}`, 'stdout');

      const proc = spawn(command, args, {
        cwd,
        shell: true,
        env: { ...process.env, FORCE_COLOR: '0', NODE_ENV: 'production' },
      });

      this.activeProcesses.set(deploymentId, proc);

      // Save PID to DB for reference
      if (proc.pid) {
        Deployment.findByIdAndUpdate(deploymentId, { pid: proc.pid }).catch(() => {});
      }

      proc.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter((l) => l.trim());
        for (const line of lines) {
          this.emitLog(deploymentId, line, 'stdout');
          onOutput?.(line);
        }
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter((l) => l.trim());
        for (const line of lines) {
          this.emitLog(deploymentId, line, 'stderr');
        }
      });

      proc.on('close', (code) => {
        this.activeProcesses.delete(deploymentId);
        this.emitLog(deploymentId, `Process exited with code ${code ?? 'null'}`, 'stdout');
        resolve(code ?? 1);
      });

      proc.on('error', (err) => {
        this.activeProcesses.delete(deploymentId);
        this.emitLog(deploymentId, `Error: ${err.message}`, 'stderr');
        reject(err);
      });
    });
  }

  /**
   * Emit a log line via WebSocket and buffer it for batch DB write
   */
  private emitLog(deploymentId: string, line: string, stream: 'stdout' | 'stderr'): void {
    const timestamp = new Date().toISOString().substring(11, 23);
    wsService.emitDeployLog(deploymentId, { line, stream, timestamp });

    // Buffer for batched MongoDB write
    if (!this.logBuffers.has(deploymentId)) {
      this.logBuffers.set(deploymentId, []);
    }
    const prefix = stream === 'stderr' ? '[ERR] ' : '';
    this.logBuffers.get(deploymentId)!.push(`[${timestamp}] ${prefix}${line}`);

    // Schedule flush every 2 seconds
    if (!this.flushTimers.has(deploymentId)) {
      const timer = setTimeout(() => {
        this.flushLogsNow(deploymentId);
      }, 2000);
      this.flushTimers.set(deploymentId, timer);
    }
  }

  /**
   * Flush buffered logs to MongoDB
   */
  private async flushLogsNow(deploymentId: string): Promise<void> {
    const buffer = this.logBuffers.get(deploymentId);
    if (!buffer || buffer.length === 0) return;

    const logs = [...buffer];
    this.logBuffers.set(deploymentId, []);

    // Clear the timer
    const timer = this.flushTimers.get(deploymentId);
    if (timer) {
      clearTimeout(timer);
      this.flushTimers.delete(deploymentId);
    }

    try {
      await Deployment.findByIdAndUpdate(deploymentId, {
        $push: { logs: { $each: logs, $slice: -5000 } },
      });
    } catch {}
  }

  /**
   * Update a step's status in the Deployment document
   */
  private async updateStep(
    deploymentId: string,
    stepName: string,
    status: string,
    exitCode?: number,
  ): Promise<void> {
    const update: any = {
      'steps.$[elem].status': status,
    };
    if (status === 'running') {
      update['steps.$[elem].startedAt'] = new Date();
    }
    if (status === 'success' || status === 'failed') {
      update['steps.$[elem].finishedAt'] = new Date();
      if (exitCode !== undefined) {
        update['steps.$[elem].exitCode'] = exitCode;
      }
    }

    try {
      await Deployment.findByIdAndUpdate(
        deploymentId,
        { $set: update },
        { arrayFilters: [{ 'elem.name': stepName }] },
      );
    } catch {}
  }

  /**
   * Mark deployment as failed
   */
  private async markFailed(deploymentId: string, error: string): Promise<void> {
    this.emitLog(deploymentId, `FAILED: ${error}`, 'stderr');
    await Deployment.findByIdAndUpdate(deploymentId, {
      status: 'failed',
      finishedAt: new Date(),
    });
    wsService.emitDeployStatus(deploymentId, { status: 'failed', error });
  }
}

export const deployRunner = new DeployRunnerService();
