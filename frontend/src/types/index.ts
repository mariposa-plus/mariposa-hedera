export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface OTPResponse {
  success: boolean;
  message: string;
  email: string;
}

export interface Item {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

// Component classification
export type ComponentType = 'hedera' | 'defi' | 'ai' | 'logic' | 'trigger' | 'output';

// Component categories (Hedera 12-category system)
export type ComponentCategory =
  | 'hedera-account'
  | 'hedera-token'
  | 'hedera-consensus'
  | 'hedera-evm'
  | 'hedera-schedule'
  | 'defi-saucerswap'
  | 'defi-bonzo'
  | 'defi-stader'
  | 'ai'
  | 'trigger'
  | 'logic'
  | 'output';

// Node states
export type NodeState = 'draft' | 'configured' | 'ready' | 'error';

// Hedera network
export type HederaNetwork = 'mainnet' | 'testnet';

// Hedera NodeType — all component types
export type NodeType =
  // Hedera Account
  | 'create-account' | 'transfer-hbar' | 'query-balance' | 'update-account'

  // Hedera Token (HTS)
  | 'create-fungible-token' | 'mint-token' | 'transfer-token' | 'query-token-info'
  | 'associate-token' | 'create-nft' | 'mint-nft' | 'approve-allowance'

  // Hedera Consensus (HCS)
  | 'create-topic' | 'submit-message' | 'query-messages'

  // Hedera EVM
  | 'deploy-erc20' | 'deploy-erc721' | 'call-contract' | 'query-contract'

  // Hedera Schedule
  | 'schedule-transaction'

  // DeFi — SaucerSwap
  | 'saucerswap-swap' | 'query-pool' | 'add-liquidity' | 'remove-liquidity'

  // DeFi — Bonzo
  | 'bonzo-deposit' | 'bonzo-withdraw' | 'bonzo-borrow' | 'bonzo-repay' | 'query-vault-position'

  // AI / LLM
  | 'llm-analyzer' | 'risk-scorer' | 'sentiment-analyzer'

  // Triggers
  | 'cron-trigger' | 'price-threshold' | 'webhook-trigger' | 'hcs-event-trigger'

  // Logic
  | 'condition' | 'data-transform' | 'loop' | 'delay'

  // Output
  | 'hcs-log' | 'telegram-alert' | 'discord-alert' | 'email-notification';

export interface NodeData {
  id: string;
  type: NodeType;
  componentType?: ComponentType;
  state?: NodeState;
  label: string;
  config?: Record<string, any>;
  fullConfig?: NodeConfiguration;
  isTrigger?: boolean;
  hederaProjectId?: string;
}

export interface PipelineNode {
  id: string;
  type: NodeType;
  componentType?: ComponentType;
  state?: NodeState;
  position: { x: number; y: number };
  data: NodeData;
}

// Input/Output Configuration Types

// Field mapping from source node to target node
export interface FieldMapping {
  sourceNodeId: string;
  sourceField: string;
  targetField: string;
  transform?: 'none' | 'stringify' | 'parse' | 'uppercase' | 'lowercase' | 'custom';
  customTransform?: string;
}

// Input configuration for a node
export interface InputConfig {
  mappings: FieldMapping[];
  requiredFields: string[];
  validatedAt?: string;
}

// Output route
export interface OutputRoute {
  targetNodeId: string;
  condition?: string;
  dataMapping?: Record<string, string>;
}

// Output configuration
export interface OutputConfig {
  routes: OutputRoute[];
  defaultFields?: string[];
}

// Complete node configuration
export interface NodeConfiguration {
  input?: InputConfig;
  component: Record<string, any>;
  output?: OutputConfig;
}

// Edge condition types
export type EdgeConditionType = 'immediate' | 'delay' | 'event' | 'approval';

// Edge condition configuration
export interface EdgeCondition {
  type: EdgeConditionType;
  delayMs?: number;
  delayUnit?: 'seconds' | 'minutes' | 'hours' | 'days';
  delayValue?: number;
  eventType?: string;
  eventConfig?: any;
  approvalConfig?: {
    required: boolean;
    approvers?: string[];
    minApprovals?: number;
    message?: string;
  };
}

export interface PipelineEdge {
  id: string;
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
  condition?: EdgeCondition;
  animated?: boolean;
  style?: any;
}

export interface Pipeline {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  isActive: boolean;
  lastExecutedAt?: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

// Component Schema System
export interface ComponentSchema {
  id: NodeType;
  name: string;
  category: ComponentCategory;
  description: string;
  icon: string; // lucide-react icon name
  color: string;
  type: ComponentType;
  isTrigger?: boolean;

  // Connection points
  handles: {
    hasTopHandle?: boolean;
    hasBottomHandle?: boolean;
    hasLeftHandle?: boolean;
    hasRightHandle?: boolean;
  };

  // Configuration schema
  configSchema?: Record<string, ConfigField>;

  // Input/Output definitions
  inputs?: ComponentIO[];
  outputs?: ComponentIO[];

  // Hedera Agent Kit metadata
  requiredPlugins?: string[];
  requiredTools?: string[];
  codeTemplate?: string;
  requiredPackages?: string[];
}

// Field configuration for component config forms
export interface ConfigField {
  type: 'text' | 'password' | 'number' | 'select' | 'textarea' | 'toggle' | 'multi-select' | 'json' | 'code' | 'text-template' | 'prompt-template' | 'monaco-solidity' | 'chain-select' | 'account-id' | 'token-id' | 'topic-id' | 'address' | 'cron';
  label: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: any;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    customValidation?: string;
  };
  helpText?: string;
  dependsOn?: string;
  acceptsInputVariables?: boolean;
  showWhen?: { field: string; value: any };
}

// Component inputs/outputs
export interface ComponentIO {
  id: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file' | 'any' | 'account' | 'token' | 'topic' | 'transaction' | 'address' | 'json';
  required?: boolean;
  description?: string;
}

// Hedera Project types (for frontend store)
export interface HederaProject {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  workspacePath: string;
  hederaNetwork: HederaNetwork;
  status: 'created' | 'ready' | 'deploying' | 'error';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HederaWorkflow {
  _id: string;
  projectId: string;
  userId: string;
  pipelineId: string;
  generatedCode?: string;
  generatedAt?: string;
  status: 'pending' | 'generated' | 'valid' | 'invalid';
  validationErrors?: string[];
  createdAt: string;
  updatedAt: string;
}
