'use client';

import { useEffect, useRef } from 'react';
import { Check, Circle, Loader2, X as XIcon, Square } from 'lucide-react';
import type { DeployLog, DeployStep, DeployRunStatus } from '@/hooks/useDeploySocket';

interface CloudTerminalProps {
  logs: DeployLog[];
  steps: DeployStep[];
  status: DeployRunStatus;
  onStop: () => void;
}

// ── Step status icon ──────────────────────────────────────────

function StepIcon({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return <Check size={12} style={{ color: '#34d399' }} />;
    case 'running':
      return <Loader2 size={12} style={{ color: '#a855f7', animation: 'spin 1s linear infinite' }} />;
    case 'failed':
      return <XIcon size={12} style={{ color: '#f87171' }} />;
    case 'skipped':
      return <Circle size={12} style={{ color: '#475569' }} />;
    default:
      return <Circle size={12} style={{ color: '#475569' }} />;
  }
}

const stepLabelMap: Record<string, string> = {
  install: 'Install',
  'register-agent': 'Register',
  start: 'Start',
};

// ── Main Component ────────────────────────────────────────────

export function CloudTerminal({ logs, steps, status, onStop }: CloudTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  // Auto-scroll unless user scrolled up
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || userScrolledUp.current) return;
    el.scrollTop = el.scrollHeight;
  }, [logs]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 40;
    userScrolledUp.current = el.scrollTop + el.clientHeight < el.scrollHeight - threshold;
  };

  const isActive = ['pending', 'installing', 'registering', 'starting', 'running'].includes(status);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        borderTop: '1px solid #1e293b',
      }}
    >
      {/* Step indicators */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          padding: '8px 16px',
          borderBottom: '1px solid #1e293b',
          background: '#0d1117',
        }}
      >
        {steps.map((step) => (
          <div
            key={step.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: step.status === 'running' ? '#a855f7' : step.status === 'success' ? '#34d399' : step.status === 'failed' ? '#f87171' : '#64748b',
              fontWeight: step.status === 'running' ? '600' : '400',
            }}
          >
            <StepIcon status={step.status} />
            {stepLabelMap[step.name] || step.name}
          </div>
        ))}
        {status === 'running' && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#34d399',
                animation: 'pulse 2s infinite',
              }}
            />
            <span style={{ fontSize: '11px', color: '#34d399' }}>Live</span>
          </div>
        )}
      </div>

      {/* Log area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px 12px',
          background: '#0a0e14',
          fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
          fontSize: '12px',
          lineHeight: '1.6',
          minHeight: '200px',
        }}
      >
        {logs.length === 0 && (
          <div style={{ color: '#475569', fontStyle: 'italic', padding: '16px 0' }}>
            Waiting for output...
          </div>
        )}
        {logs.map((log, i) => (
          <div
            key={i}
            style={{
              color: log.stream === 'stderr' ? '#f87171' : log.line.startsWith('$') ? '#a855f7' : '#c9d1d9',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              fontWeight: log.line.startsWith('$') ? '600' : '400',
            }}
          >
            <span style={{ color: '#475569', marginRight: '8px', fontSize: '10px' }}>
              {log.timestamp}
            </span>
            {log.line}
          </div>
        ))}

        {/* Status footer in log area */}
        {status === 'failed' && (
          <div style={{ color: '#f87171', fontWeight: '600', marginTop: '8px', padding: '4px 0', borderTop: '1px solid #1e293b' }}>
            Deployment failed.
          </div>
        )}
        {status === 'stopped' && (
          <div style={{ color: '#f59e0b', fontWeight: '600', marginTop: '8px', padding: '4px 0', borderTop: '1px solid #1e293b' }}>
            Deployment stopped.
          </div>
        )}
      </div>

      {/* Footer: Stop button */}
      {isActive && (
        <div
          style={{
            padding: '8px 12px',
            borderTop: '1px solid #1e293b',
            background: '#0d1117',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onStop}
            style={{
              padding: '6px 14px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            <Square size={12} />
            Stop
          </button>
        </div>
      )}

      {/* Inline keyframes for animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
