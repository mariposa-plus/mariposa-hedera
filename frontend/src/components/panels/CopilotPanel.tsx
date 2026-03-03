'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Loader2, ChevronDown, ChevronRight, Play } from 'lucide-react';
import { api } from '@/lib/api';

// ── Types ───────────────────────────────────────────────────────────

interface CopilotAction {
  action: 'add_node' | 'update_node' | 'delete_node' | 'add_edge' | 'delete_edge';
  node_type?: string;
  label?: string;
  config?: Record<string, any>;
  position?: { x: number; y: number };
  node_id?: string;
  source?: string;
  target?: string;
  condition?: Record<string, any>;
  edge_id?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: CopilotAction[];
  actionsApplied?: boolean;
}

interface CopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: any[];
  edges: any[];
  onApplyActions: (actions: CopilotAction[]) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────

function actionLabel(a: CopilotAction): string {
  switch (a.action) {
    case 'add_node':
      return `Add "${a.label || a.node_type}"`;
    case 'update_node':
      return `Update node ${a.node_id}`;
    case 'delete_node':
      return `Delete node ${a.node_id}`;
    case 'add_edge':
      return `Connect ${a.source} → ${a.target}`;
    case 'delete_edge':
      return `Remove edge ${a.edge_id}`;
    default:
      return JSON.stringify(a);
  }
}

function actionColor(a: CopilotAction): string {
  switch (a.action) {
    case 'add_node':
    case 'add_edge':
      return '#34d399';
    case 'update_node':
      return '#fbbf24';
    case 'delete_node':
    case 'delete_edge':
      return '#ef4444';
    default:
      return '#888';
  }
}

// ── Component ───────────────────────────────────────────────────────

export function CopilotPanel({
  isOpen,
  onClose,
  nodes,
  edges,
  onApplyActions,
}: CopilotPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedActions, setExpandedActions] = useState<Record<number, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const toggleActions = (idx: number) => {
    setExpandedActions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleApply = useCallback(
    (idx: number) => {
      const msg = messages[idx];
      if (!msg?.actions?.length) return;
      onApplyActions(msg.actions);
      setMessages((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, actionsApplied: true } : m)),
      );
    },
    [messages, onApplyActions],
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history for the API (only role + content)
      const apiMessages = updated.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await api.post('/copilot/chat', {
        messages: apiMessages,
        nodes,
        edges,
      });

      const { message, actions } = response.data;
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: message,
        actions: actions?.length ? actions : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Auto-expand actions for the latest message
      if (actions?.length) {
        setExpandedActions((prev) => ({
          ...prev,
          [updated.length]: true, // index of the assistant message
        }));
      }
    } catch (error: any) {
      const errMsg =
        error.response?.data?.message || error.message || 'Something went wrong';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${errMsg}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, nodes, edges]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '420px',
        height: '100vh',
        background: '#0d1117',
        borderLeft: '2px solid #2a3f5f',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #2a3f5f',
          background: '#161b22',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: '#f59e0b' }} />
          <span style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>
            AI Copilot
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '4px',
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: '#555',
              textAlign: 'center',
              padding: '40px 20px',
            }}
          >
            <Sparkles size={36} style={{ color: '#f59e0b', opacity: 0.5 }} />
            <div style={{ fontSize: '14px' }}>
              Ask me to build CRE workflows!
            </div>
            <div style={{ fontSize: '12px', color: '#444' }}>
              e.g. &quot;Create a workflow that fetches ETH price every hour and writes it on-chain&quot;
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx}>
            {/* Message bubble */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '90%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  ...(msg.role === 'user'
                    ? {
                        background: '#2563eb',
                        color: '#fff',
                        borderBottomRightRadius: '4px',
                      }
                    : {
                        background: '#1c2333',
                        color: '#c9d1d9',
                        borderBottomLeftRadius: '4px',
                      }),
                }}
              >
                {msg.content}
              </div>
            </div>

            {/* Actions block */}
            {msg.actions && msg.actions.length > 0 && (
              <div
                style={{
                  marginTop: '8px',
                  background: '#161b22',
                  border: '1px solid #2a3f5f',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                {/* Actions header */}
                <button
                  onClick={() => toggleActions(idx)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: '#c9d1d9',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {expandedActions[idx] ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                    {msg.actions.length} canvas action{msg.actions.length > 1 ? 's' : ''}
                  </span>
                  {msg.actionsApplied ? (
                    <span style={{ color: '#34d399', fontSize: '11px' }}>
                      Applied
                    </span>
                  ) : null}
                </button>

                {/* Actions list */}
                {expandedActions[idx] && (
                  <div style={{ padding: '0 12px 8px' }}>
                    {msg.actions.map((a, ai) => (
                      <div
                        key={ai}
                        style={{
                          padding: '4px 0',
                          fontSize: '12px',
                          color: actionColor(a),
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ opacity: 0.5 }}>
                          {a.action === 'add_node' || a.action === 'add_edge'
                            ? '+'
                            : a.action === 'delete_node' || a.action === 'delete_edge'
                            ? '-'
                            : '~'}
                        </span>
                        {actionLabel(a)}
                      </div>
                    ))}

                    {/* Apply button */}
                    {!msg.actionsApplied && (
                      <button
                        onClick={() => handleApply(idx)}
                        style={{
                          marginTop: '8px',
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          background: '#2563eb',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        <Play size={14} />
                        Apply to Canvas
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              color: '#888',
              fontSize: '13px',
            }}
          >
            <Loader2
              size={16}
              style={{ animation: 'spin 1s linear infinite' }}
            />
            Thinking...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          borderTop: '1px solid #2a3f5f',
          padding: '12px 16px',
          background: '#161b22',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to build a workflow..."
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              padding: '10px 12px',
              background: '#0d1117',
              border: '1px solid #2a3f5f',
              borderRadius: '8px',
              color: '#c9d1d9',
              fontSize: '13px',
              lineHeight: '1.4',
              outline: 'none',
              fontFamily: 'inherit',
              maxHeight: '120px',
              overflowY: 'auto',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              padding: '10px',
              background:
                !input.trim() || isLoading ? '#1c2333' : '#2563eb',
              border: 'none',
              borderRadius: '8px',
              color: !input.trim() || isLoading ? '#555' : '#fff',
              cursor:
                !input.trim() || isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
