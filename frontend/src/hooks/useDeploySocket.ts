'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface DeployLog {
  line: string;
  stream: 'stdout' | 'stderr';
  timestamp: string;
}

export interface DeployStep {
  name: 'install' | 'register-agent' | 'start';
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  exitCode?: number;
}

export type DeployRunStatus =
  | 'idle'
  | 'pending'
  | 'installing'
  | 'registering'
  | 'starting'
  | 'running'
  | 'stopped'
  | 'failed';

function getWsUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  // Strip /api suffix to get the base URL for Socket.io
  return apiUrl.replace(/\/api\/?$/, '');
}

export function useDeploySocket(deploymentId: string | null) {
  const [logs, setLogs] = useState<DeployLog[]>([]);
  const [steps, setSteps] = useState<DeployStep[]>([]);
  const [status, setStatus] = useState<DeployRunStatus>('idle');
  const socketRef = useRef<Socket | null>(null);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    if (!deploymentId) {
      setStatus('idle');
      return;
    }

    setStatus('pending');

    const socket = io(getWsUrl(), {
      transports: ['polling', 'websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', { room: `deploy:${deploymentId}` });
    });

    socket.on('deploy:log', (data: DeployLog) => {
      setLogs((prev) => [...prev, data]);
    });

    socket.on('deploy:step', (data: DeployStep) => {
      setSteps((prev) => {
        const existing = prev.findIndex((s) => s.name === data.name);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], ...data };
          return updated;
        }
        return [...prev, data];
      });
    });

    socket.on('deploy:status', (data: { status: DeployRunStatus; error?: string }) => {
      setStatus(data.status);
    });

    return () => {
      socket.emit('leave', { room: `deploy:${deploymentId}` });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [deploymentId]);

  return { logs, steps, status, clearLogs, setLogs, setSteps, setStatus };
}
