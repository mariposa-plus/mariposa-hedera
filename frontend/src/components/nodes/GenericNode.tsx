'use client';

import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { NodeWrapper } from './NodeWrapper';
import { getComponentById } from '@/registry';
import * as LucideIcons from 'lucide-react';

/**
 * GenericNode
 * Universal node component that renders any component based on its schema.
 * Used for all Hedera, DeFi, AI, Logic, Trigger, and Output node types.
 */
export const GenericNode = memo(({ data }: NodeProps) => {
  const component = getComponentById(data.type);

  if (!component) {
    // Fallback for unknown component types
    return (
      <NodeWrapper
        id={data.id}
        icon={LucideIcons.HelpCircle}
        label={data.label || 'Unknown'}
        color="#888"
        componentType="hedera"
      >
        <div style={{ fontSize: '12px', color: '#aaa' }}>Unknown component type: {data.type}</div>
      </NodeWrapper>
    );
  }

  // Get the icon component from lucide-react
  const IconComponent = (LucideIcons as any)[component.icon] || LucideIcons.Box;

  // Extract handle configuration
  const {
    hasTopHandle = true,
    hasBottomHandle = true,
    hasLeftHandle = false,
    hasRightHandle = false,
  } = component.handles;

  return (
    <NodeWrapper
      id={data.id}
      icon={IconComponent}
      label={component.name}
      color={component.color}
      state={data.state}
      componentType={component.type}
      hasTopHandle={hasTopHandle}
      hasBottomHandle={hasBottomHandle}
      hasLeftHandle={hasLeftHandle}
      hasRightHandle={hasRightHandle}
    >
      {/* Component description or label */}
      <div style={{ fontSize: '12px', color: '#aaa' }}>
        {data.label || component.description}
      </div>

      {/* Display key configuration values if available */}
      {data.config && Object.keys(data.config).length > 0 && (
        <div style={{ marginTop: '10px', fontSize: '11px', color: '#888' }}>
          {Object.entries(data.config).slice(0, 3).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '4px' }}>
              <strong>{key}:</strong>{' '}
              {typeof value === 'object' ? JSON.stringify(value).slice(0, 30) + '...' : String(value).slice(0, 30)}
            </div>
          ))}
        </div>
      )}

      {/* Trigger indicator */}
      {component.isTrigger && (
        <div
          style={{
            marginTop: '8px',
            fontSize: '10px',
            fontWeight: '600',
            color: '#10b981',
            background: 'rgba(16, 185, 129, 0.2)',
            padding: '2px 6px',
            borderRadius: '4px',
            display: 'inline-block',
          }}
        >
          TRIGGER
        </div>
      )}
    </NodeWrapper>
  );
});

GenericNode.displayName = 'GenericNode';
