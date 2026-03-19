import { Server as SocketIOServer, Socket } from 'socket.io';
import http from 'http';

class WebSocketService {
  private io: SocketIOServer | null = null;

  /**
   * Initialize Socket.io on the HTTP server
   */
  init(httpServer: http.Server): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: [
          'https://hash.mariposa.plus',
          process.env.FRONTEND_URL || 'http://localhost:3000',
          'http://localhost:3000',
        ],
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`WebSocket client connected: ${socket.id}`);

      // Join project-specific rooms
      socket.on('join', (data: { room: string }) => {
        if (data.room) {
          socket.join(data.room);
          console.log(`Socket ${socket.id} joined room: ${data.room}`);
        }
      });

      socket.on('leave', (data: { room: string }) => {
        if (data.room) {
          socket.leave(data.room);
        }
      });

      socket.on('disconnect', () => {
        console.log(`WebSocket client disconnected: ${socket.id}`);
      });
    });

    console.log('WebSocket service initialized');
  }

  /**
   * Emit a simulation log line to project room
   */
  emitSimulationLog(projectId: string, log: string): void {
    if (!this.io) return;
    this.io.to(`sim:${projectId}`).emit('simulation:log', log);
  }

  /**
   * Emit simulation completion event
   */
  emitSimulationComplete(projectId: string, success: boolean, exitCode: number): void {
    if (!this.io) return;
    this.io.to(`sim:${projectId}`).emit('simulation:complete', { success, exitCode });
  }

  /**
   * Emit compilation progress
   */
  emitCompilationProgress(contractId: string, event: { status: string; message: string }): void {
    if (!this.io) return;
    this.io.to(`compile:${contractId}`).emit('compilation:progress', event);
  }

  /**
   * Emit workflow generation result
   */
  emitWorkflowGenerated(pipelineId: string, result: { code: string; warnings: string[] }): void {
    if (!this.io) return;
    this.io.to(`pipeline:${pipelineId}`).emit('workflow:generated', result);
  }

  /**
   * Emit Hedera authentication completion event
   */
  emitHederaAuthComplete(success: boolean, email?: string): void {
    if (!this.io) return;
    this.io.emit('hedera:auth:complete', { success, email });
  }

  /**
   * Emit a deploy log line to deployment room
   */
  emitDeployLog(deploymentId: string, log: { line: string; stream: 'stdout' | 'stderr'; timestamp: string }): void {
    if (!this.io) return;
    this.io.to(`deploy:${deploymentId}`).emit('deploy:log', log);
  }

  /**
   * Emit deploy step status update
   */
  emitDeployStep(deploymentId: string, step: { name: string; status: string; exitCode?: number }): void {
    if (!this.io) return;
    this.io.to(`deploy:${deploymentId}`).emit('deploy:step', step);
  }

  /**
   * Emit overall deploy status change
   */
  emitDeployStatus(deploymentId: string, data: { status: string; error?: string }): void {
    if (!this.io) return;
    this.io.to(`deploy:${deploymentId}`).emit('deploy:status', data);
  }

  /**
   * Get the Socket.io server instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }
}

export const wsService = new WebSocketService();
