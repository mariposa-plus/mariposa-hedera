import { spawn } from 'child_process';
import CREProject from '../models/CREProject';
import { wsService } from './websocket.service';
import { creAuth } from './creAuth.service';
import { creProjectManager } from './creProjectManager.service';

const CRE_CLI_PATH = process.env.CRE_CLI_PATH || 'cre';
const SIMULATION_TIMEOUT = 60000; // 60 seconds

class CRESimulatorService {
  /**
   * Run CRE workflow simulation and stream logs via WebSocket
   */
  async simulate(projectId: string, workflowName: string): Promise<void> {
    // Check CRE authentication before running simulation
    const authStatus = await creAuth.checkStatus();
    if (!authStatus.authenticated) {
      throw new Error('CRE authentication required. Please login first.');
    }

    const project = await CREProject.findById(projectId);
    if (!project) throw new Error('CRE project not found');

    // Ensure project scaffolding files exist (self-heal legacy projects)
    await creProjectManager.ensureProjectFiles(projectId);

    project.status = 'simulating';
    project.simulationLogs = [];
    await project.save();

    const logs: string[] = [];

    return new Promise<void>((resolve, reject) => {
      const child = spawn(
        CRE_CLI_PATH,
        ['workflow', 'simulate', workflowName, '--trigger-index', '0', '--target', 'staging-settings', '--non-interactive'],
        {
          cwd: project.workspacePath,
          env: {
            ...process.env,
            ...this.loadEnvFile(project.workspacePath),
          },
          shell: true,
        }
      );

      const timeout = setTimeout(async () => {
        child.kill('SIGTERM');
        const timeoutMsg = `Simulation timed out after ${SIMULATION_TIMEOUT / 1000}s`;
        logs.push(timeoutMsg);
        wsService.emitSimulationLog(projectId, timeoutMsg);
        wsService.emitSimulationComplete(projectId, false, -1);

        project.status = 'error';
        project.errorMessage = timeoutMsg;
        project.simulationLogs = logs.slice(-500);
        project.lastSimulatedAt = new Date();
        await project.save();
        reject(new Error(timeoutMsg));
      }, SIMULATION_TIMEOUT);

      const processLine = (line: string, isStderr: boolean) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        logs.push(trimmed);
        wsService.emitSimulationLog(projectId, trimmed);

        // Highlight [USER LOG] entries
        if (trimmed.includes('[USER LOG]')) {
          wsService.emitSimulationLog(projectId, `>>> ${trimmed}`);
        }
      };

      let stdoutBuffer = '';
      child.stdout?.on('data', (data: Buffer) => {
        stdoutBuffer += data.toString();
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() || '';
        lines.forEach(line => processLine(line, false));
      });

      let stderrBuffer = '';
      child.stderr?.on('data', (data: Buffer) => {
        stderrBuffer += data.toString();
        const lines = stderrBuffer.split('\n');
        stderrBuffer = lines.pop() || '';
        lines.forEach(line => processLine(line, true));
      });

      child.on('close', async (code) => {
        clearTimeout(timeout);

        // Flush remaining buffers
        if (stdoutBuffer.trim()) processLine(stdoutBuffer, false);
        if (stderrBuffer.trim()) processLine(stderrBuffer, true);

        const success = code === 0;
        wsService.emitSimulationComplete(projectId, success, code || 0);

        project.status = success ? 'ready' : 'error';
        project.errorMessage = success ? undefined : `Simulation exited with code ${code}`;
        project.simulationLogs = logs.slice(-500);
        project.lastSimulatedAt = new Date();
        await project.save();

        if (success) {
          resolve();
        } else {
          reject(new Error(`Simulation failed with exit code ${code}`));
        }
      });

      child.on('error', async (error) => {
        clearTimeout(timeout);
        const errorMsg = `Failed to start simulation: ${error.message}`;
        logs.push(errorMsg);
        wsService.emitSimulationLog(projectId, errorMsg);
        wsService.emitSimulationComplete(projectId, false, -1);

        project.status = 'error';
        project.errorMessage = errorMsg;
        project.simulationLogs = logs.slice(-500);
        project.lastSimulatedAt = new Date();
        await project.save();

        reject(error);
      });
    });
  }

  /**
   * Load .env file as key-value pairs
   */
  private loadEnvFile(projectDir: string): Record<string, string> {
    try {
      const fs = require('fs');
      const path = require('path');
      const envPath = path.join(projectDir, '.env');
      if (!fs.existsSync(envPath)) return {};

      const content = fs.readFileSync(envPath, 'utf-8');
      const env: Record<string, string> = {};
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.substring(0, eqIndex).trim();
        const value = trimmed.substring(eqIndex + 1).trim();
        if (key && value) env[key] = value;
      }
      return env;
    } catch {
      return {};
    }
  }
}

export const creSimulator = new CRESimulatorService();
