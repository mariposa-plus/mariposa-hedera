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
   * Emit CRE authentication completion event
   */
  emitCREAuthComplete(success: boolean, email?: string): void {
    if (!this.io) return;
    this.io.emit('cre:auth:complete', { success, email });
  }

  emitCRECodeNeeded(): void {
    if (!this.io) return;
    this.io.emit('cre:code:needed');
  }

  /**
   * Get the Socket.io server instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }
}

export const wsService = new WebSocketService();
