'use client';

import { useState, lazy, Suspense } from 'react';
import { ConfigField } from '@/types';
import { AlertCircle, Check, X } from 'lucide-react';
import { PromptTemplateField, AvailableVariable } from './PromptTemplateField';
import { TextTemplateField } from './TextTemplateField';

// Lazy-load Monaco to avoid SSR issues
const MonacoEditor = lazy(() => import('@monaco-editor/react').then(mod => ({ default: mod.default })));

// Supported EVM chains for chain-select field
const EVM_CHAINS = [
  { value: 'ethereum-testnet-sepolia', label: 'Ethereum Sepolia (Testnet)' },
  { value: 'ethereum-mainnet', label: 'Ethereum Mainnet' },
  { value: 'arbitrum-testnet-sepolia', label: 'Arbitrum Sepolia (Testnet)' },
  { value: 'arbitrum-mainnet', label: 'Arbitrum Mainnet' },
  { value: 'base-testnet-sepolia', label: 'Base Sepolia (Testnet)' },
  { value: 'base-mainnet', label: 'Base Mainnet' },
  { value: 'avalanche-testnet-fuji', label: 'Avalanche Fuji (Testnet)' },
  { value: 'avalanche-mainnet', label: 'Avalanche Mainnet' },
  { value: 'polygon-testnet-amoy', label: 'Polygon Amoy (Testnet)' },
  { value: 'polygon-mainnet', label: 'Polygon Mainnet' },
  { value: 'optimism-testnet-sepolia', label: 'Optimism Sepolia (Testnet)' },
  { value: 'optimism-mainnet', label: 'Optimism Mainnet' },
  { value: 'bsc-testnet', label: 'BNB Chain Testnet' },
  { value: 'bsc-mainnet', label: 'BNB Chain Mainnet' },
];

interface ConfigFieldRendererProps {
  fieldName: string;
  fieldDef: ConfigField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  availableVariables?: AvailableVariable[];
}

export function ConfigFieldRenderer({
  fieldName,
  fieldDef,
  value,
  onChange,
  error,
  availableVariables = [],
}: ConfigFieldRendererProps) {
  const [isFocused, setIsFocused] = useState(false);

  const renderField = () => {
    switch (fieldDef.type) {
      case 'monaco-solidity':
        return (
          <div style={{
            border: error ? '1px solid #ef4444' : '1px solid #2a3f5f',
            borderRadius: '6px',
            overflow: 'hidden',
          }}>
            <Suspense fallback={
              <div style={{ height: '400px', background: '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                Loading editor...
              </div>
            }>
              <MonacoEditor
                height="400px"
                language="sol"
                theme="vs-dark"
                value={value || fieldDef.defaultValue || ''}
                onChange={(val) => onChange(val || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  tabSize: 4,
                  automaticLayout: true,
                }}
              />
            </Suspense>
          </div>
        );

      case 'chain-select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#1a1a2e',
              border: error ? '1px solid #ef4444' : '1px solid #2a3f5f',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Select Chain</option>
            <optgroup label="Testnets">
              {EVM_CHAINS.filter(c => c.value.includes('testnet') || c.value.includes('fuji') || c.value.includes('amoy')).map((chain) => (
                <option key={chain.value} value={chain.value}>{chain.label}</option>
              ))}
            </optgroup>
            <optgroup label="Mainnets">
              {EVM_CHAINS.filter(c => c.value.includes('mainnet')).map((chain) => (
                <option key={chain.value} value={chain.value}>{chain.label}</option>
              ))}
            </optgroup>
          </select>
        );

      case 'account-id':
      case 'token-id':
      case 'topic-id':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={fieldDef.placeholder || '0.0.XXXXX'}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#1a1a2e',
              border: error ? '1px solid #ef4444' : isFocused ? '1px solid #3b82f6' : '1px solid #2a3f5f',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s',
              fontFamily: 'monospace',
            }}
          />
        );

      case 'address':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={fieldDef.placeholder || '0x...'}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#1a1a2e',
              border: error ? '1px solid #ef4444' : isFocused ? '1px solid #3b82f6' : '1px solid #2a3f5f',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s',
              fontFamily: 'monospace',
            }}
          />
        );

      case 'cron':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={fieldDef.placeholder || '*/5 * * * *'}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#1a1a2e',
              border: error ? '1px solid #ef4444' : isFocused ? '1px solid #3b82f6' : '1px solid #2a3f5f',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s',
              fontFamily: 'monospace',
            }}
          />
        );

      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={fieldDef.placeholder}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#1a1a2e',
              border: error ? '1px solid #ef4444' : isFocused ? '1px solid #3b82f6' : '1px solid #2a3f5f',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
        );

      case 'password':
        return (
          <input
            type="password"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={fieldDef.placeholder}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoComplete="new-password"
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#1a1a2e',
              border: error ? '1px solid #ef4444' : isFocused ? '1px solid #3b82f6' : '1px solid #2a3f5f',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s',
              fontFamily: 'monospace',
            }}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
            placeholder={fieldDef.placeholder}
            min={fieldDef.validation?.min}
            max={fieldDef.validation?.max}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#1a1a2e',
              border: error ? '1px solid #ef4444' : isFocused ? '1px solid #3b82f6' : '1px solid #2a3f5f',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#1a1a2e',
              border: error ? '1px solid #ef4444' : '1px solid #2a3f5f',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Select {fieldDef.label}</option>
            {fieldDef.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'multi-select':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {fieldDef.options?.map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  background: selectedValues.includes(opt.value) ? '#3b82f620' : 'transparent',
                  border: '1px solid #2a3f5f',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...selectedValues, opt.value]);
                    } else {
                      onChange(selectedValues.filter((v: string) => v !== opt.value));
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ color: '#fff', fontSize: '14px' }}>{opt.label}</span>
              </label>
            ))}
          </div>
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={fieldDef.placeholder}
            rows={6}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#1a1a2e',
              border: error ? '1px solid #ef4444' : isFocused ? '1px solid #3b82f6' : '1px solid #2a3f5f',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'monospace',
              transition: 'border-color 0.2s',
            }}
          />
        );

      case 'toggle':
        return (
          <button
            type="button"
            onClick={() => onChange(!value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: value ? '#10b981' : '#2a3f5f',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {value ? <Check size={16} /> : <X size={16} />}
            {value ? 'Enabled' : 'Disabled'}
          </button>
        );

      case 'json':
      case 'code':
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch {
                onChange(e.target.value);
              }
            }}
            placeholder={fieldDef.placeholder}
            rows={8}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#1a1a2e',
              border: error ? '1px solid #ef4444' : isFocused ? '1px solid #3b82f6' : '1px solid #2a3f5f',
              borderRadius: '6px',
              color: '#34d399',
              fontSize: '13px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: '"Fira Code", "Courier New", monospace',
              transition: 'border-color 0.2s',
            }}
          />
        );

      case 'text-template':
        return (
          <TextTemplateField
            value={value}
            onChange={onChange}
            availableVariables={availableVariables}
            placeholder={fieldDef.placeholder}
            label={fieldDef.label}
            required={fieldDef.required}
            helpText={fieldDef.helpText}
            error={error}
          />
        );

      case 'prompt-template':
        return (
          <PromptTemplateField
            value={value}
            onChange={onChange}
            availableVariables={availableVariables}
            placeholder={fieldDef.placeholder}
            helpText={fieldDef.helpText}
            error={error}
          />
        );

      default:
        return <div style={{ color: '#888' }}>Unsupported field type: {fieldDef.type}</div>;
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Label */}
      {fieldDef.type !== 'text-template' && fieldDef.type !== 'prompt-template' && (
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#fff' }}>
          {fieldDef.label}
          {fieldDef.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}

      {/* Field */}
      {renderField()}

      {/* Help Text */}
      {fieldDef.type !== 'text-template' && fieldDef.type !== 'prompt-template' && fieldDef.helpText && !error && (
        <div style={{ marginTop: '6px', fontSize: '12px', color: '#888', lineHeight: '1.4' }}>
          {fieldDef.helpText}
        </div>
      )}

      {/* Validation Range (for number fields) */}
      {fieldDef.type === 'number' && fieldDef.validation && !error && (
        <div style={{ marginTop: '6px', fontSize: '12px', color: '#888' }}>
          {fieldDef.validation.min !== undefined && fieldDef.validation.max !== undefined
            ? `Range: ${fieldDef.validation.min} - ${fieldDef.validation.max}`
            : fieldDef.validation.min !== undefined
            ? `Minimum: ${fieldDef.validation.min}`
            : fieldDef.validation.max !== undefined
            ? `Maximum: ${fieldDef.validation.max}`
            : null}
        </div>
      )}

      {/* Error Message */}
      {fieldDef.type !== 'text-template' && fieldDef.type !== 'prompt-template' && error && (
        <div
          style={{
            marginTop: '6px',
            padding: '8px 10px',
            background: '#ef444420',
            border: '1px solid #ef4444',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#ef4444',
          }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
}
