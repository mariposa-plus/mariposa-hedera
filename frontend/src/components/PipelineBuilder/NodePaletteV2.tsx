'use client';

import { useState } from 'react';
import { NodeType, ComponentCategory } from '@/types';
import { COMPONENTS_BY_CATEGORY, CATEGORY_METADATA } from '@/registry';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';

interface NodePaletteV2Props {
  onNodeDragStart: (event: React.DragEvent, nodeType: NodeType) => void;
}

export function NodePaletteV2({ onNodeDragStart }: NodePaletteV2Props) {
  const [expandedCategories, setExpandedCategories] = useState<Set<ComponentCategory>>(
    new Set<ComponentCategory>(['trigger', 'hedera-account'])
  );
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCategory = (category: ComponentCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Filter components based on search
  const filteredCategories = Object.entries(COMPONENTS_BY_CATEGORY).map(([categoryId, components]) => {
    const componentsArray = Object.values(components);

    if (!searchQuery) return { categoryId: categoryId as ComponentCategory, components: componentsArray };

    const filtered = componentsArray.filter((component) =>
      component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return { categoryId: categoryId as ComponentCategory, components: filtered };
  }).filter(({ components }) => components.length > 0);

  return (
    <div
      style={{
        width: '300px',
        background: '#16213e',
        borderRight: '1px solid #2a3f5f',
        padding: '20px',
        color: '#fff',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <h3 style={{ marginBottom: '15px', fontSize: '18px', fontWeight: '600' }}>
        Components
      </h3>

      {/* Search */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#888' }} />
        <input
          type="text"
          placeholder="Search components..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 8px 8px 35px',
            background: '#1a1a2e',
            border: '1px solid #2a3f5f',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '13px',
            outline: 'none',
          }}
        />
      </div>

      {/* Categories */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredCategories.map(({ categoryId, components }) => {
          const category = CATEGORY_METADATA[categoryId];
          const isExpanded = expandedCategories.has(categoryId) || searchQuery !== '';
          const CategoryIcon = (LucideIcons as any)[category.icon] || LucideIcons.Box;

          return (
            <div key={categoryId} style={{ marginBottom: '12px' }}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(categoryId)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  background: '#1a1a2e',
                  border: `1px solid ${category.color}40`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: '#fff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${category.color}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1a1a2e';
                }}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <CategoryIcon size={18} color={category.color} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{category.name}</div>
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                    {Object.values(components).length} components
                  </div>
                </div>
              </button>

              {/* Components List */}
              {isExpanded && (
                <div style={{ marginTop: '8px', marginLeft: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.values(components).map((component) => {
                    const ComponentIcon = (LucideIcons as any)[component.icon] || LucideIcons.Box;

                    return (
                      <div
                        key={component.id}
                        draggable
                        onDragStart={(e) => onNodeDragStart(e, component.id)}
                        style={{
                          padding: '10px',
                          background: '#1a1a2e',
                          border: component.isTrigger
                            ? '2px solid rgba(16, 185, 129, 0.6)'
                            : `1px solid ${component.color}60`,
                          borderRadius: component.isTrigger ? '8px' : '6px',
                          cursor: 'grab',
                          transition: 'all 0.2s',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = `${component.color}15`;
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#1a1a2e';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                        onMouseDown={(e) => {
                          (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
                        }}
                        onMouseUp={(e) => {
                          (e.currentTarget as HTMLElement).style.cursor = 'grab';
                        }}
                      >
                        {/* Trigger Badge */}
                        {component.isTrigger && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '-4px',
                              right: '-4px',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: '#fff',
                              fontSize: '8px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              textTransform: 'uppercase',
                            }}
                          >
                            TRIGGER
                          </div>
                        )}

                        {/* Component Info */}
                        <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                          <ComponentIcon size={16} color={component.color} style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>
                              {component.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.4' }}>
                              {component.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <div style={{ marginTop: '20px', padding: '15px', background: '#1a1a2e', borderRadius: '8px', borderLeft: `3px solid #3b82f6` }}>
        <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.6' }}>
          <strong style={{ color: '#fff', display: 'block', marginBottom: '6px' }}>How to use:</strong>
          Drag components onto the canvas to build your pipeline. Connect them to create automation flows.
        </div>
      </div>
    </div>
  );
}
