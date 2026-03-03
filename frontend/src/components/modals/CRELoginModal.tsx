'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCREStore } from '@/store/creStore';
import { X, Check, Loader2, LogIn, AlertCircle, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { io } from 'socket.io-client';

interface CRELoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pipelineId?: string;
}

type ModalStep = 'initial' | 'authenticating' | 'code-needed' | 'submitting-code' | 'success' | 'error';

export function CRELoginModal({ isOpen, onClose, onSuccess, pipelineId }: CRELoginModalProps) {
  const {
    creAuthEmail,
    authError,
    startCreHeadlessLogin,
    submitVerificationCode,
  } = useCREStore();

  const [step, setStep] = useState<ModalStep>('initial');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('initial');
      setLocalError(null);
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setVerificationCode('');
    }
  }, [isOpen]);

  const handleLogin = useCallback(async () => {
    if (!email || !password) return;
    setLocalError(null);
    setStep('authenticating');

    try {
      await startCreHeadlessLogin(email, password, pipelineId);
      setStep('success');
    } catch (err: any) {
      setLocalError(err.response?.data?.message || err.message || 'Authentication failed');
      setStep('error');
    }
  }, [email, password, startCreHeadlessLogin, pipelineId]);

  const handleRetry = useCallback(() => {
    setStep('initial');
    setLocalError(null);
    setPassword('');
  }, []);

  const handleSuccess = useCallback(() => {
    onSuccess();
    onClose();
  }, [onSuccess, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && email && password && step === 'initial') {
      handleLogin();
    }
  }, [email, password, step, handleLogin]);

  const handleSubmitCode = useCallback(async () => {
    if (!verificationCode) return;
    setStep('submitting-code');
    try {
      await submitVerificationCode(verificationCode);
      // Return to authenticating — the original headless login POST will resolve
      setStep('authenticating');
    } catch (err: any) {
      setLocalError(err.response?.data?.message || err.message || 'Failed to submit code');
      setStep('error');
    }
  }, [verificationCode, submitVerificationCode]);

  // Listen for WebSocket signal that a verification code is needed
  useEffect(() => {
    if (step !== 'authenticating') return;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const socket = io(backendUrl, { transports: ['websocket', 'polling'] });

    socket.on('cre:code:needed', () => {
      setStep('code-needed');
      setVerificationCode('');
    });

    return () => {
      socket.disconnect();
    };
  }, [step]);

  if (!isOpen) return null;

  const displayError = localError || authError;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: '12px',
          border: '1px solid #2a3f5f',
          maxWidth: '520px',
          width: '90vw',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid #2a3f5f',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LogIn size={20} color="#7c3aed" />
            <h2 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 600 }}>
              CRE Authentication
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Initial: email + password form */}
          {step === 'initial' && (
            <div onKeyDown={handleKeyDown}>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.6', margin: '0 0 20px 0' }}>
                Enter your CRE credentials to authenticate. Your credentials are used once to complete the login and are not stored.
              </p>

              {/* Email */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#ccc', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#0d1117',
                    border: '1px solid #2a3f5f',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#ccc', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 14px',
                      background: '#0d1117',
                      border: '1px solid #2a3f5f',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleLogin}
                disabled={!email || !password}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: !email || !password ? '#4a4a6a' : '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: !email || !password ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: !email || !password ? 0.7 : 1,
                }}
              >
                <LogIn size={18} />
                Log In
              </button>
            </div>
          )}

          {/* Authenticating spinner */}
          {step === 'authenticating' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Loader2 size={40} color="#7c3aed" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <h3 style={{ color: '#fff', fontSize: '16px', margin: '0 0 8px 0' }}>
                Authenticating...
              </h3>
              <p style={{ color: '#aaa', fontSize: '14px', margin: 0 }}>
                This may take a few seconds
              </p>
            </div>
          )}

          {/* Verification code needed */}
          {step === 'code-needed' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(234, 179, 8, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <ShieldAlert size={28} color="#eab308" />
              </div>
              <h3 style={{ color: '#fff', fontSize: '16px', margin: '0 0 8px 0' }}>
                Verification Code Required
              </h3>
              <p style={{ color: '#aaa', fontSize: '14px', margin: '0 0 20px 0' }}>
                A verification code was sent to your email. Enter it below to continue.
              </p>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && verificationCode) handleSubmitCode(); }}
                placeholder="Enter code"
                autoFocus
                style={{
                  width: '220px',
                  padding: '12px 16px',
                  background: '#0d1117',
                  border: '1px solid #2a3f5f',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '24px',
                  fontWeight: 600,
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                  outline: 'none',
                  margin: '0 auto 20px',
                  display: 'block',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={handleSubmitCode}
                disabled={!verificationCode}
                style={{
                  padding: '12px 32px',
                  background: !verificationCode ? '#4a4a6a' : '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: !verificationCode ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                  opacity: !verificationCode ? 0.7 : 1,
                }}
              >
                Submit Code
              </button>
            </div>
          )}

          {/* Submitting verification code */}
          {step === 'submitting-code' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Loader2 size={40} color="#7c3aed" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <h3 style={{ color: '#fff', fontSize: '16px', margin: '0 0 8px 0' }}>
                Verifying code...
              </h3>
              <p style={{ color: '#aaa', fontSize: '14px', margin: 0 }}>
                Submitting your verification code
              </p>
            </div>
          )}

          {/* Success state */}
          {step === 'success' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Check size={28} color="#10b981" />
              </div>
              <h3 style={{ color: '#fff', fontSize: '16px', margin: '0 0 8px 0' }}>
                Authenticated!
              </h3>
              <p style={{ color: '#aaa', fontSize: '14px', margin: '0 0 24px 0' }}>
                {creAuthEmail ? `Logged in as ${creAuthEmail}` : 'CRE login successful'}
              </p>
              <button
                onClick={handleSuccess}
                style={{
                  padding: '12px 32px',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                }}
              >
                Continue
              </button>
            </div>
          )}

          {/* Error state */}
          {step === 'error' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <AlertCircle size={28} color="#ef4444" />
              </div>
              <h3 style={{ color: '#fff', fontSize: '16px', margin: '0 0 8px 0' }}>
                Login Failed
              </h3>
              <p style={{ color: '#ef4444', fontSize: '14px', margin: '0 0 24px 0' }}>
                {displayError || 'An unknown error occurred'}
              </p>
              <button
                onClick={handleRetry}
                style={{
                  padding: '12px 32px',
                  background: '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Keyframe animation for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
