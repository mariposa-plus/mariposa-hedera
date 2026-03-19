'use client';

import { useState } from 'react';
import { X, Rocket, Bot, Server, Loader2, Check, FileCode, Play } from 'lucide-react';
import { useHederaStore } from '@/store/hederaStore';
import { useDeploySocket } from '@/hooks/useDeploySocket';
import { CloudTerminal } from './CloudTerminal';

interface DeployPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineId: string;
  pipelineName: string;
}

// ── Inline styles ────────────────────────────────────────────────

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderBottom: '1px solid #2a3f5f',
  background: '#161b22',
};

const sectionStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #1e293b',
};

const labelStyle: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '12px',
  fontWeight: '600',
  marginBottom: '6px',
  display: 'block',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '13px',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: '60px',
  resize: 'vertical' as const,
};

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 0',
};

const footerStyle: React.CSSProperties = {
  borderTop: '1px solid #2a3f5f',
  padding: '12px 16px',
  background: '#161b22',
};

// ── Toggle Switch ────────────────────────────────────────────────

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={toggleRowStyle}>
      <span style={{ color: '#cbd5e1', fontSize: '13px' }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: '40px',
          height: '22px',
          borderRadius: '11px',
          background: checked ? '#a855f7' : '#334155',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.2s',
        }}
      >
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: '3px',
            left: checked ? '21px' : '3px',
            transition: 'left 0.2s',
          }}
        />
      </button>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────

export function DeployPanel({ isOpen, onClose, pipelineId, pipelineName }: DeployPanelProps) {
  const {
    deployConfig,
    setHCS10Config,
    setMCPConfig,
    setDeployConfig,
    isDeploying,
    deployResult,
    generateWithDeploy,
    error,
    activeDeploymentId,
    startDeployRun,
    stopDeployRun,
    resetDeployRun,
  } = useHederaStore();

  const [showSuccess, setShowSuccess] = useState(false);
  const [isStartingRun, setIsStartingRun] = useState(false);

  // WebSocket hook for real-time logs
  const { logs, steps, status: runStatus } = useDeploySocket(activeDeploymentId);

  if (!isOpen) return null;

  const showTerminal = !!activeDeploymentId;

  const handleGenerate = async () => {
    try {
      await generateWithDeploy(pipelineId);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch {}
  };

  const handleDeployRun = async () => {
    setIsStartingRun(true);
    try {
      await startDeployRun(pipelineId);
    } catch {}
    setIsStartingRun(false);
  };

  const handleStop = async () => {
    if (activeDeploymentId) {
      await stopDeployRun(activeDeploymentId);
    }
  };

  const canGenerate = deployConfig.hcs10.enabled || deployConfig.mcp.enabled;

  // Auto-fill agent name from pipeline name if empty
  if (deployConfig.hcs10.enabled && !deployConfig.hcs10.agentName && pipelineName) {
    setHCS10Config({ agentName: pipelineName });
  }

  const isRunActive = ['pending', 'installing', 'registering', 'starting', 'running'].includes(runStatus);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: showTerminal ? '640px' : '480px',
        height: '100vh',
        background: '#0d1117',
        borderLeft: '2px solid #2a3f5f',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        transition: 'width 0.3s ease',
      }}
    >
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Rocket size={18} style={{ color: '#a855f7' }} />
          <span style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>
            Deploy as Agent
          </span>
          {isRunActive && (
            <span style={{
              fontSize: '11px',
              color: '#34d399',
              background: '#0f291a',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: '600',
            }}>
              {runStatus.toUpperCase()}
            </span>
          )}
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

      {/* Scrollable config content — hide when terminal is showing */}
      {!showTerminal && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Network */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Network</label>
            <select
              value={deployConfig.network}
              onChange={(e) => setDeployConfig({ network: e.target.value as any })}
              style={selectStyle}
            >
              <option value="testnet">Testnet</option>
              <option value="mainnet">Mainnet</option>
            </select>
          </div>

          {/* HCS-10 Agent Section */}
          <div style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Bot size={16} style={{ color: '#a855f7' }} />
              <span style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>HCS-10 Agent</span>
            </div>

            <Toggle
              label="Register as HCS-10 Agent"
              checked={deployConfig.hcs10.enabled}
              onChange={(v) => setHCS10Config({ enabled: v })}
            />

            {deployConfig.hcs10.enabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <div>
                  <label style={labelStyle}>Agent Name</label>
                  <input
                    style={inputStyle}
                    value={deployConfig.hcs10.agentName}
                    onChange={(e) => setHCS10Config({ agentName: e.target.value })}
                    placeholder="My DeFi Agent"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    style={textareaStyle}
                    value={deployConfig.hcs10.agentDescription}
                    onChange={(e) => setHCS10Config({ agentDescription: e.target.value })}
                    placeholder="Describe what this agent does..."
                  />
                </div>
                <div>
                  <label style={labelStyle}>Agent Type</label>
                  <select
                    style={selectStyle}
                    value={deployConfig.hcs10.agentType}
                    onChange={(e) => setHCS10Config({ agentType: e.target.value as any })}
                  >
                    <option value="autonomous">Autonomous</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <Toggle
                  label="Auto-accept connections"
                  checked={deployConfig.hcs10.autoAcceptConnections}
                  onChange={(v) => setHCS10Config({ autoAcceptConnections: v })}
                />
                <Toggle
                  label="Register on HOL Registry Broker"
                  checked={deployConfig.hcs10.registerOnBroker}
                  onChange={(v) => setHCS10Config({ registerOnBroker: v })}
                />
              </div>
            )}
          </div>

          {/* MCP Server Section */}
          <div style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Server size={16} style={{ color: '#3b82f6' }} />
              <span style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>MCP Server</span>
            </div>

            <Toggle
              label="Expose as MCP Server"
              checked={deployConfig.mcp.enabled}
              onChange={(v) => setMCPConfig({ enabled: v })}
            />

            {deployConfig.mcp.enabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <div>
                  <label style={labelStyle}>Transport</label>
                  <select
                    style={selectStyle}
                    value={deployConfig.mcp.transport}
                    onChange={(e) => setMCPConfig({ transport: e.target.value as any })}
                  >
                    <option value="stdio">stdio (local, Claude Desktop)</option>
                    <option value="sse">SSE/HTTP (network, Cursor)</option>
                  </select>
                </div>
                {deployConfig.mcp.transport === 'sse' && (
                  <div>
                    <label style={labelStyle}>Port</label>
                    <input
                      type="number"
                      style={inputStyle}
                      value={deployConfig.mcp.port}
                      onChange={(e) => setMCPConfig({ port: parseInt(e.target.value) || 3001 })}
                      min={1024}
                      max={65535}
                    />
                  </div>
                )}
                <Toggle
                  label="Register MCP on HOL"
                  checked={deployConfig.mcp.registerOnBroker}
                  onChange={(v) => setMCPConfig({ registerOnBroker: v })}
                />
              </div>
            )}
          </div>

          {/* Success / Generated Files */}
          {deployResult && (
            <div style={{ ...sectionStyle, background: '#0f291a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Check size={16} style={{ color: '#34d399' }} />
                <span style={{ color: '#34d399', fontWeight: '600', fontSize: '13px' }}>
                  Project Generated
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                {deployResult.generatedFiles.length} files generated:
              </div>
              {deployResult.generatedFiles.map((f) => (
                <div
                  key={f}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 0',
                    fontSize: '12px',
                    color: '#cbd5e1',
                  }}
                >
                  <FileCode size={12} style={{ color: '#a855f7' }} />
                  {f}
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ ...sectionStyle, background: '#2d1215' }}>
              <span style={{ color: '#f87171', fontSize: '13px' }}>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Cloud Terminal — shown when deployment is active */}
      {showTerminal && (
        <CloudTerminal
          logs={logs}
          steps={steps}
          status={runStatus}
          onStop={handleStop}
        />
      )}

      {/* Footer */}
      <div style={footerStyle}>
        {/* Show "Generate" when no result yet, "Deploy & Run" after generation */}
        {!deployResult && !showTerminal && (
          <>
            <button
              onClick={handleGenerate}
              disabled={isDeploying || !canGenerate}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: canGenerate ? (isDeploying ? '#6b21a8' : '#a855f7') : '#334155',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: canGenerate && !isDeploying ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600',
                opacity: canGenerate ? 1 : 0.5,
                transition: 'all 0.2s',
              }}
            >
              {isDeploying ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Generating...
                </>
              ) : showSuccess ? (
                <>
                  <Check size={16} />
                  Generated!
                </>
              ) : (
                <>
                  <Rocket size={16} />
                  Generate Project
                </>
              )}
            </button>
            {!canGenerate && (
              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                Enable HCS-10 Agent or MCP Server to generate
              </div>
            )}
          </>
        )}

        {/* Deploy & Run button — shown after project is generated */}
        {deployResult && !showTerminal && (
          <button
            onClick={handleDeployRun}
            disabled={isStartingRun}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: isStartingRun ? '#6b21a8' : '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: isStartingRun ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
            }}
          >
            {isStartingRun ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Starting...
              </>
            ) : (
              <>
                <Play size={16} />
                Deploy &amp; Run
              </>
            )}
          </button>
        )}

        {/* Back to config button — when terminal is visible and not running */}
        {showTerminal && !isRunActive && (
          <button
            onClick={resetDeployRun}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: '#334155',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Back to Configuration
          </button>
        )}
      </div>

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
