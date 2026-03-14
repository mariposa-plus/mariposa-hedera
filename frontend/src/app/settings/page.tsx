'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/Layout/AppLayout';
import { useHederaStore } from '@/store/hederaStore';
import { Save, Eye, EyeOff, Network, Key, User } from 'lucide-react';

export default function SettingsPage() {
  const { hederaNetwork, setNetwork } = useHederaStore();
  const [operatorId, setOperatorId] = useState('');
  const [operatorKey, setOperatorKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load saved settings from localStorage
    const savedId = localStorage.getItem('hedera_operator_id') || '';
    const savedKey = localStorage.getItem('hedera_operator_key') || '';
    setOperatorId(savedId);
    setOperatorKey(savedKey);
  }, []);

  const handleSave = () => {
    localStorage.setItem('hedera_operator_id', operatorId);
    localStorage.setItem('hedera_operator_key', operatorKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    background: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    color: '#1a1a2e',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'monospace',
    transition: 'border-color 0.2s',
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div style={{ padding: '40px', minHeight: '100vh' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a2e', marginBottom: '8px' }}>
            Settings
          </h1>
          <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '32px' }}>
            Configure your Hedera operator credentials and network settings.
          </p>

          {/* Hedera Network Configuration */}
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid #e9ecef',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Network size={20} color="#fff" />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a2e', margin: 0 }}>
                  Hedera Network
                </h2>
                <p style={{ fontSize: '13px', color: '#6c757d', margin: 0 }}>
                  Select the Hedera network for workflow execution
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              {(['testnet', 'mainnet'] as const).map((net) => (
                <button
                  key={net}
                  onClick={() => setNetwork(net)}
                  style={{
                    flex: 1,
                    padding: '16px',
                    borderRadius: '12px',
                    border: hederaNetwork === net ? '2px solid #3b82f6' : '2px solid #e9ecef',
                    background: hederaNetwork === net ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    fontSize: '16px', fontWeight: '600',
                    color: hederaNetwork === net ? '#3b82f6' : '#1a1a2e',
                    textTransform: 'capitalize',
                  }}>
                    {net}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                    {net === 'testnet' ? 'For development and testing' : 'For production use'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Operator Credentials */}
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid #e9ecef',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Key size={20} color="#fff" />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a2e', margin: 0 }}>
                  Operator Credentials
                </h2>
                <p style={{ fontSize: '13px', color: '#6c757d', margin: 0 }}>
                  Your Hedera operator account for signing transactions
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1a1a2e', marginBottom: '8px' }}>
                <User size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Operator Account ID
              </label>
              <input
                type="text"
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                placeholder="0.0.XXXXX"
                style={inputStyle}
              />
              <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '6px' }}>
                Your Hedera account ID (e.g., 0.0.12345)
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1a1a2e', marginBottom: '8px' }}>
                <Key size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Operator Private Key
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={operatorKey}
                  onChange={(e) => setOperatorKey(e.target.value)}
                  placeholder="302e020100300506032b657004220420..."
                  autoComplete="new-password"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', cursor: 'pointer', color: '#6c757d',
                  }}
                >
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '6px' }}>
                DER-encoded ED25519 or ECDSA private key
              </p>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              background: saved ? '#10b981' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Save size={18} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
