'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAuthStore } from '@/store/authStore';
import { usePipelinesStore } from '@/store/pipelineStore';
import { NodeType, PipelineNode } from '@/types';

// New generic component system
import { NodePaletteV2 } from '@/components/PipelineBuilder/NodePaletteV2';
import { nodeTypes as genericNodeTypes } from '@/utils/nodeTypeMapping';
import { UniversalConfigModal } from '@/components/modals/UniversalConfigModal';
import { GenericConfigForm } from '@/components/modals/config-forms/GenericConfigForm';
import { EdgeConditionModal } from '@/components/modals/EdgeConditionModal';
import { TestExecutionModal } from '@/components/modals/TestExecutionModal';
import { ConditionalEdge } from '@/components/edges/ConditionalEdge';
import { Save, ArrowLeft, Play, Beaker, Code2, Sparkles } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { NodeConfiguration, EdgeCondition, ComponentType } from '@/types';
import { getComponentById } from '@/registry';
import { usePipelineLifecycle } from '@/hooks/usePipelineLifecycle';
import { PipelineStatusBadge } from '@/components/pipeline/PipelineStatusBadge';
import { PipelineActivateButton } from '@/components/pipeline/PipelineActivateButton';
import { WorkflowCodePanel } from '@/components/panels/WorkflowCodePanel';
import { CopilotPanel } from '@/components/panels/CopilotPanel';
import { useHederaStore } from '@/store/hederaStore';

// Use the generic node types mapping (supports all Hedera components)
const nodeTypes = genericNodeTypes;

const edgeTypes = {
  default: ConditionalEdge,
};

// Helper function to transform React Flow nodes to MongoDB format
const transformNodesForSave = (reactFlowNodes: Node[]): any[] => {
  return reactFlowNodes.map(node => ({
    id: node.id,
    type: node.type,
    componentType: node.data?.componentType,
    state: node.data?.state,
    position: {
      x: node.position.x,
      y: node.position.y,
    },
    data: node.data,
  }));
};

// Helper function to transform React Flow edges to MongoDB format
const transformEdgesForSave = (reactFlowEdges: Edge[]) => {
  return reactFlowEdges.map(edge => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle || undefined,
    target: edge.target,
    targetHandle: edge.targetHandle || undefined,
    condition: edge.data?.condition,
    animated: edge.animated,
    style: edge.style,
  }));
};

function PipelineBuilderContent() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const { currentPipeline, isLoading, error, fetchPipeline, savePipeline } = usePipelinesStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Modal state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Edge condition modal state
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isEdgeModalOpen, setIsEdgeModalOpen] = useState(false);

  // Test execution modal state
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // Run pipeline state
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  // Code panel state
  const [isCodePanelOpen, setIsCodePanelOpen] = useState(false);
  const { generatedCode, isGenerating, generateWarnings, generateWorkflow } = useHederaStore();

  // Copilot panel state
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Helper functions to get connected nodes
  const getUpstreamNodes = useCallback((node: Node): PipelineNode[] => {
    return edges
      .filter(edge => edge.target === node.id)
      .map(edge => nodes.find(n => n.id === edge.source))
      .filter(Boolean)
      .map(n => n as Node as PipelineNode);
  }, [nodes, edges]);

  const getDownstreamNodes = useCallback((node: Node): PipelineNode[] => {
    return edges
      .filter(edge => edge.source === node.id)
      .map(edge => nodes.find(n => n.id === edge.target))
      .filter(Boolean)
      .map(n => n as Node as PipelineNode);
  }, [nodes, edges]);

  const pipelineId = params.id as string;

  // Pipeline lifecycle management
  const token = useAuthStore.getState().token || '';
  const {
    status: pipelineStatus,
    isActivating,
    isDeactivating,
    activate,
    deactivate,
  } = usePipelineLifecycle({
    pipelineId,
    token,
    autoRefresh: true,
    refreshInterval: 5000, // Refresh status every 5 seconds
  });

  // Load pipeline data
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (pipelineId) {
      fetchPipeline(pipelineId);
    }
  }, [isAuthenticated, hasHydrated, pipelineId, router]);

  // Initialize nodes and edges from loaded pipeline
  useEffect(() => {
    if (currentPipeline && currentPipeline._id === pipelineId) {
      // Transform MongoDB nodes to React Flow format
      const reactFlowNodes: Node[] = currentPipeline.nodes.map((node: any) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      }));

      setNodes(reactFlowNodes);
      setEdges(currentPipeline.edges as Edge[]);
      setHasUnsavedChanges(false);
    }
  }, [currentPipeline, pipelineId, setNodes, setEdges]);

  // Save function - DO NOT memoize to avoid dependency loops
  const handleSave = async () => {
    if (!currentPipeline) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Get current nodes and edges at save time
      const currentNodes = nodes;
      const currentEdges = edges;

      // Transform nodes and edges to MongoDB-compatible format
      const cleanedNodes = transformNodesForSave(currentNodes);
      const cleanedEdges = transformEdgesForSave(currentEdges);

      // Get token and API URL
      const token = useAuthStore.getState().token;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      // Use native fetch to bypass axios middleware
      const response = await fetch(`${API_URL}/pipelines/${currentPipeline._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          nodes: cleanedNodes,
          edges: cleanedEdges,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save pipeline');
      }

      const data = await response.json();
      // Update currentPipeline in store
      usePipelinesStore.setState({ currentPipeline: data.data });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.error('Save failed:', err);
      setSaveError(err.message || 'Failed to save pipeline');
    } finally {
      setIsSaving(false);
    }
  };

  // Run pipeline execution
  const handleRunPipeline = async () => {
    if (!currentPipeline) return;

    // Save first if there are unsaved changes
    if (hasUnsavedChanges) {
      await handleSave();
    }

    setIsRunning(true);
    setRunError(null);

    try {
      const token = useAuthStore.getState().token;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await fetch(`${API_URL}/executions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          pipelineId: currentPipeline._id,
          triggerType: 'manual',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start execution');
      }

      const data = await response.json();
      console.log('Pipeline execution started:', data);

      // Optionally: redirect to execution view or show success message
      alert(`Pipeline execution started! Execution ID: ${data.data._id}`);
    } catch (err: any) {
      console.error('Run failed:', err);
      setRunError(err.message || 'Failed to run pipeline');
      alert(`Error: ${err.message || 'Failed to run pipeline'}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Generate workflow code
  const handleGenerateCode = useCallback(async () => {
    if (!pipelineId) return;
    try {
      await generateWorkflow(pipelineId);
      setIsCodePanelOpen(true);
    } catch {}
  }, [pipelineId, generateWorkflow]);

  // Copilot: apply AI-proposed actions to the canvas
  const applyCopilotActions = useCallback(
    (actions: any[]) => {
      // Map placeholder IDs (NEW_1, NEW_2…) to real generated IDs
      const idMap: Record<string, string> = {};
      let positionOffset = 0;

      for (const action of actions) {
        switch (action.action) {
          case 'add_node': {
            const nodeType = action.node_type || 'http-fetch';
            const ts = Date.now() + positionOffset;
            const nodeId = `${nodeType}-${ts}`;
            positionOffset++;

            // Track placeholder → real ID
            if (action.placeholder_id) {
              idMap[action.placeholder_id] = nodeId;
            }

            // Determine component type from registry
            const componentDef = getComponentById(nodeType);
            const componentType: ComponentType = componentDef?.type || 'hedera';

            const pos = action.position || { x: 250 + positionOffset * 250, y: 200 };

            const newNode: Node = {
              id: nodeId,
              type: nodeType,
              position: pos,
              data: {
                id: nodeId,
                type: nodeType,
                componentType,
                state: action.config ? 'configured' : 'draft',
                label: action.label || componentDef?.name || nodeType,
                ...(action.config ? { config: action.config } : {}),
              },
            };

            setNodes((nds) => nds.concat(newNode));
            break;
          }

          case 'update_node': {
            if (!action.node_id) break;
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id === action.node_id) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      ...(action.label ? { label: action.label } : {}),
                      ...(action.config
                        ? {
                            config: { ...node.data?.config, ...action.config },
                            state: 'configured',
                          }
                        : {}),
                    },
                  };
                }
                return node;
              }),
            );
            break;
          }

          case 'delete_node': {
            if (!action.node_id) break;
            const targetId = action.node_id;
            setNodes((nds) => nds.filter((n) => n.id !== targetId));
            setEdges((eds) =>
              eds.filter((e) => e.source !== targetId && e.target !== targetId),
            );
            break;
          }

          case 'add_edge': {
            const source = idMap[action.source] || action.source;
            const target = idMap[action.target] || action.target;
            const edgeId = `e-${source}-${target}`;

            setEdges((eds) =>
              addEdge(
                {
                  id: edgeId,
                  source,
                  target,
                  data: {
                    condition: action.condition || { type: 'immediate' },
                  },
                },
                eds,
              ),
            );
            break;
          }

          case 'delete_edge': {
            if (!action.edge_id) break;
            setEdges((eds) => eds.filter((e) => e.id !== action.edge_id));
            break;
          }
        }
      }
    },
    [setNodes, setEdges],
  );

  // Mark as unsaved when nodes or edges change (but only after initial load)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (currentPipeline && currentPipeline._id === pipelineId) {
      setHasUnsavedChanges(true);
    }
  }, [nodes, edges, currentPipeline, pipelineId]);

  // Save before leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        handleSave();
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]); // Removed handleSave dependency to prevent re-renders

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        data: {
          condition: { type: 'immediate' as const },
          onEdgeClick: handleEdgeClick,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Handle edge click to open condition modal
  const handleEdgeClick = useCallback((edgeId: string) => {
    const edge = edges.find((e) => e.id === edgeId);
    if (edge) {
      setSelectedEdge(edge);
      setIsEdgeModalOpen(true);
    }
  }, [edges]);

  // Handle saving edge condition
  const handleEdgeConditionSave = useCallback((condition: EdgeCondition) => {
    if (!selectedEdge) return;

    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === selectedEdge.id) {
          return {
            ...edge,
            data: {
              ...edge.data,
              condition,
            },
          };
        }
        return edge;
      })
    );

    setIsEdgeModalOpen(false);
    setSelectedEdge(null);
  }, [selectedEdge, setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!nodeType || !reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Determine component type from registry
      const componentDef = getComponentById(nodeType);
      const componentType: ComponentType = componentDef?.type || 'hedera';

      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position,
        data: {
          id: `${nodeType}-${Date.now()}`,
          type: nodeType,
          componentType,
          state: 'draft',
          label: componentDef?.name || `New ${nodeType}`,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle node click to open config modal
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsConfigModalOpen(true);
  }, []);

  // Handle saving node configuration
  const handleNodeConfigSave = useCallback((fullConfig: NodeConfiguration) => {
    if (!selectedNode) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const componentConfig = fullConfig.component;
          const label = componentConfig.name || node.data.label;

          return {
            ...node,
            data: {
              ...node.data,
              config: componentConfig,
              fullConfig,
              label,
              state: 'configured',
            },
          };
        }
        return node;
      })
    );

    setIsConfigModalOpen(false);
    setSelectedNode(null);
  }, [selectedNode, setNodes]);

  // Handle silent save (update node data without closing modal)
  const handleNodeSilentSave = useCallback((fullConfig: NodeConfiguration) => {
    if (!selectedNode) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const componentConfig = fullConfig.component;
          const label = componentConfig.name || node.data.label;

          return {
            ...node,
            data: {
              ...node.data,
              config: componentConfig,
              fullConfig,
              label,
            },
          };
        }
        return node;
      })
    );

    // Note: We do NOT close the modal or clear selectedNode
  }, [selectedNode, setNodes]);

  // Handle deleting a node
  const handleNodeDelete = useCallback(() => {
    if (!selectedNode) return;

    if (confirm(`Are you sure you want to delete this ${selectedNode.data.label} node?`)) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));

      setIsConfigModalOpen(false);
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  // Close modal
  const closeModal = useCallback(() => {
    setIsConfigModalOpen(false);
    setSelectedNode(null);
  }, []);

  // Render appropriate config form based on node type (all use GenericConfigForm)
  const renderComponentConfig = (node: Node | null) => {
    if (!node) return null;

    const nodeType = node.type as NodeType;
    const config = node.data?.config || {};

    // Use generic config form for all components
    const componentSchema = getComponentById(nodeType);

    if (componentSchema && componentSchema.configSchema) {
      return (
        <GenericConfigForm
          componentSchema={componentSchema}
          initialConfig={config}
          onSave={(componentConfig: any) => {
            const fullConfig: NodeConfiguration = {
              input: node.data?.fullConfig?.input || { mappings: [], requiredFields: [] },
              component: componentConfig,
              output: node.data?.fullConfig?.output || { routes: [], defaultFields: [] },
            };
            handleNodeConfigSave(fullConfig);
          }}
        />
      );
    }

    return (
      <div style={{ padding: '20px', color: '#fff', textAlign: 'center' }}>
        <p>Configuration for {nodeType} is coming soon!</p>
        <p style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
          This component is available in the canvas but configuration is not yet implemented.
        </p>
      </div>
    );
  };

  // Get modal title and icon based on node type from registry
  const getModalInfo = (node: Node | null) => {
    if (!node) return { title: '', icon: null, color: '#888' };

    const nodeType = node.type as NodeType;
    const component = getComponentById(nodeType);

    if (component) {
      const IconComponent = (LucideIcons as any)[component.icon] || LucideIcons.Box;
      return {
        title: 'Configure ' + component.name,
        icon: <IconComponent size={22} color={component.color} />,
        color: component.color,
      };
    }

    return { title: `Configure ${nodeType}`, icon: null, color: '#888' };
  };

  if (!hasHydrated || !isAuthenticated) {
    return null;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f1419' }}>
      <NodePaletteV2 onNodeDragStart={onNodeDragStart} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div
          style={{
            background: '#16213e',
            borderBottom: '1px solid #2a3f5f',
            padding: '15px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={() => router.push('/pipelines')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '14px',
              }}
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <h2 style={{ color: '#fff', fontSize: '18px', margin: 0 }}>
                  {currentPipeline?.name || 'Loading...'}
                </h2>
                {pipelineStatus && (
                  <PipelineStatusBadge status={pipelineStatus.status} size="sm" />
                )}
              </div>
              <div style={{ fontSize: '12px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isSaving && (
                  <span style={{ color: '#3b82f6' }}>
                    Saving...
                  </span>
                )}
                {!isSaving && lastSaved && !hasUnsavedChanges && (
                  <span style={{ color: '#10b981' }}>
                    Saved at {lastSaved.toLocaleTimeString()}
                  </span>
                )}
                {!isSaving && hasUnsavedChanges && (
                  <span style={{ color: '#f59e0b' }}>
                    Unsaved changes
                  </span>
                )}
                {saveError && (
                  <span style={{ color: '#ef4444' }}>
                    {saveError}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '8px 16px',
                background: '#0070f3',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
              }}
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setIsTestModalOpen(true)}
              style={{
                padding: '8px 16px',
                background: '#8b5cf6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
              }}
            >
              <Beaker size={16} />
              Test
            </button>
            <button
              onClick={handleRunPipeline}
              disabled={isRunning}
              style={{
                padding: '8px 16px',
                background: isRunning ? '#6b7280' : '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                opacity: isRunning ? 0.6 : 1,
              }}
            >
              <Play size={16} />
              {isRunning ? 'Running...' : 'Run'}
            </button>

            {/* Separator */}
            <div style={{ width: '1px', height: '32px', background: '#2a3f5f' }} />

            {/* Generate Code */}
            <button
              onClick={handleGenerateCode}
              disabled={isGenerating}
              style={{
                padding: '8px 16px',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                opacity: isGenerating ? 0.6 : 1,
              }}
              title="Generate Hedera Agent Kit code"
            >
              <Code2 size={16} />
              {isGenerating ? 'Generating...' : 'Code'}
            </button>

            {/* AI Copilot */}
            <button
              onClick={() => setIsCopilotOpen((v) => !v)}
              style={{
                padding: '8px 16px',
                background: isCopilotOpen ? '#b45309' : '#f59e0b',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: '600',
              }}
              title="AI Copilot"
            >
              <Sparkles size={16} />
              {isCopilotOpen ? 'Close AI' : 'AI Copilot'}
            </button>

            <div style={{ width: '1px', height: '32px', background: '#2a3f5f' }} />

            {/* Pipeline Activate/Deactivate Button */}
            {pipelineStatus && (
              <PipelineActivateButton
                isActive={pipelineStatus.isActive}
                status={pipelineStatus.status}
                isActivating={isActivating}
                isDeactivating={isDeactivating}
                onActivate={activate}
                onDeactivate={deactivate}
              />
            )}
          </div>
        </div>

        {/* Canvas */}
        {error && (
          <div style={{ padding: '20px', background: '#dc3545', color: '#fff' }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <p>Loading pipeline...</p>
          </div>
        ) : (
          <div ref={reactFlowWrapper} style={{ flex: 1 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              onInit={setReactFlowInstance}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              nodesDraggable={true}
              nodesConnectable={true}
              elementsSelectable={true}
              fitView
              style={{ background: '#0f1419' }}
            >
              <Background color="#2a3f5f" gap={16} />
              <Controls />
              <MiniMap
                style={{ background: '#16213e' }}
                nodeColor={(node) => {
                  const component = getComponentById(node.type as NodeType);
                  return component?.color || '#888';
                }}
              />
            </ReactFlow>
          </div>
        )}
      </div>

      {/* UniversalConfigModal - uses GenericConfigForm for all nodes */}
      {selectedNode && (
        <UniversalConfigModal
          isOpen={isConfigModalOpen}
          onClose={closeModal}
          node={selectedNode as unknown as PipelineNode}
          connectedNodes={{
            upstream: getUpstreamNodes(selectedNode),
            downstream: getDownstreamNodes(selectedNode)
          }}
          title={getModalInfo(selectedNode).title}
          color={getModalInfo(selectedNode).color}
          icon={getModalInfo(selectedNode).icon}
          onSave={handleNodeConfigSave}
          onSilentSave={handleNodeSilentSave}
          onDelete={handleNodeDelete}
        >
          {renderComponentConfig(selectedNode)}
        </UniversalConfigModal>
      )}

      {/* EdgeConditionModal */}
      {selectedEdge && (
        <EdgeConditionModal
          isOpen={isEdgeModalOpen}
          onClose={() => {
            setIsEdgeModalOpen(false);
            setSelectedEdge(null);
          }}
          onSave={handleEdgeConditionSave}
          initialCondition={selectedEdge.data?.condition}
          edgeId={selectedEdge.id}
        />
      )}

      {/* TestExecutionModal */}
      <TestExecutionModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        pipelineId={pipelineId}
        pipelineName={currentPipeline?.name || 'Pipeline'}
      />

      {/* Workflow Code Panel */}
      <WorkflowCodePanel
        isOpen={isCodePanelOpen}
        onClose={() => setIsCodePanelOpen(false)}
        code={generatedCode}
        isGenerating={isGenerating}
        onGenerate={handleGenerateCode}
        warnings={generateWarnings}
      />

      {/* AI Copilot Panel */}
      <CopilotPanel
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        nodes={nodes}
        edges={edges}
        onApplyActions={applyCopilotActions}
      />
    </div>
  );
}

export default function PipelineBuilderPage() {
  return (
    <Suspense fallback={<div style={{ background: '#0f1419', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading...</div>}>
      <ReactFlowProvider>
        <PipelineBuilderContent />
      </ReactFlowProvider>
    </Suspense>
  );
}
