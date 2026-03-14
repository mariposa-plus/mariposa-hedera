'use client';

import { useState, lazy, Suspense } from 'react';
import { X, Copy, Check, Code2, RefreshCw } from 'lucide-react';

const MonacoEditor = lazy(() => import('@monaco-editor/react').then(mod => ({ default: mod.default })));

interface WorkflowCodePanelProps {
  isOpen: boolean;
  onClose: () => void;
  code: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
  warnings?: string[];
}

export function WorkflowCodePanel({
  isOpen,
  onClose,
  code,
  isGenerating,
  onGenerate,
  warnings = [],
}: WorkflowCodePanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '600px',
      height: '100vh',
      background: '#0d1117',
      borderLeft: '2px solid #2a3f5f',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #2a3f5f',
        background: '#161b22',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code2 size={18} style={{ color: '#7c3aed' }} />
          <span style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>
            Generated Hedera Workflow
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 12px',
              background: isGenerating ? '#2a3f5f' : '#2563eb',
              border: 'none', borderRadius: '4px',
              color: '#fff', fontSize: '13px', cursor: isGenerating ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} style={isGenerating ? { animation: 'spin 1s linear infinite' } : {}} />
            {isGenerating ? 'Generating...' : 'Regenerate'}
          </button>
          <button
            onClick={handleCopy}
            disabled={!code}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 8px',
              background: 'transparent', border: '1px solid #2a3f5f',
              borderRadius: '4px', color: copied ? '#34d399' : '#888',
              fontSize: '13px', cursor: code ? 'pointer' : 'not-allowed',
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '4px', background: 'transparent', border: 'none',
              color: '#888', cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{
          padding: '8px 16px',
          background: '#fbbf2410',
          borderBottom: '1px solid #2a3f5f',
        }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ color: '#fbbf24', fontSize: '12px' }}>
              Warning: {w}
            </div>
          ))}
        </div>
      )}

      {/* Code Editor */}
      <div style={{ flex: 1 }}>
        {code ? (
          <Suspense fallback={
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
              Loading editor...
            </div>
          }>
            <MonacoEditor
              height="100%"
              language="typescript"
              theme="vs-dark"
              value={code}
              options={{
                readOnly: true,
                minimap: { enabled: true },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
              }}
            />
          </Suspense>
        ) : (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            color: '#555',
          }}>
            <Code2 size={48} />
            <div>Click "Regenerate" to generate Hedera workflow code</div>
            <div style={{ fontSize: '12px' }}>
              The code will be generated from your canvas nodes and connections
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {code && (
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid #2a3f5f',
          background: '#161b22',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#888',
        }}>
          <span>{code.split('\n').length} lines</span>
          <span>TypeScript (Hedera Agent Kit)</span>
        </div>
      )}
    </div>
  );
}
