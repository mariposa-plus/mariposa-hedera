/**
 * Hedera Component Registry
 * Aggregates all 12 Hedera component categories
 */

import { ComponentSchema, ComponentCategory } from '@/types';
import { HEDERA_ACCOUNT_COMPONENTS } from './hedera-account';
import { HEDERA_TOKEN_COMPONENTS } from './hedera-token';
import { HEDERA_CONSENSUS_COMPONENTS } from './hedera-consensus';
import { HEDERA_EVM_COMPONENTS } from './hedera-evm';
import { HEDERA_SCHEDULE_COMPONENTS } from './hedera-schedule';
import { DEFI_SAUCERSWAP_COMPONENTS } from './defi-saucerswap';
import { DEFI_BONZO_COMPONENTS } from './defi-bonzo';
import { AI_COMPONENTS } from './ai-components';
import { TRIGGER_COMPONENTS } from './triggers';
import { LOGIC_COMPONENTS } from './logic-components';
import { OUTPUT_COMPONENTS } from './output-components';

// Aggregate all components
export const ALL_COMPONENTS: Record<string, ComponentSchema> = {
  ...HEDERA_ACCOUNT_COMPONENTS,
  ...HEDERA_TOKEN_COMPONENTS,
  ...HEDERA_CONSENSUS_COMPONENTS,
  ...HEDERA_EVM_COMPONENTS,
  ...HEDERA_SCHEDULE_COMPONENTS,
  ...DEFI_SAUCERSWAP_COMPONENTS,
  ...DEFI_BONZO_COMPONENTS,
  ...AI_COMPONENTS,
  ...TRIGGER_COMPONENTS,
  ...LOGIC_COMPONENTS,
  ...OUTPUT_COMPONENTS,
};

// Components organized by category
export const COMPONENTS_BY_CATEGORY: Record<ComponentCategory, Record<string, ComponentSchema>> = {
  'hedera-account': HEDERA_ACCOUNT_COMPONENTS,
  'hedera-token': HEDERA_TOKEN_COMPONENTS,
  'hedera-consensus': HEDERA_CONSENSUS_COMPONENTS,
  'hedera-evm': HEDERA_EVM_COMPONENTS,
  'hedera-schedule': HEDERA_SCHEDULE_COMPONENTS,
  'defi-saucerswap': DEFI_SAUCERSWAP_COMPONENTS,
  'defi-bonzo': DEFI_BONZO_COMPONENTS,
  'defi-stader': {}, // Placeholder for future Stader integration
  'ai': AI_COMPONENTS,
  'trigger': TRIGGER_COMPONENTS,
  'logic': LOGIC_COMPONENTS,
  'output': OUTPUT_COMPONENTS,
};

// Category metadata
export interface CategoryMetadata {
  id: ComponentCategory;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export const CATEGORY_METADATA: Record<ComponentCategory, CategoryMetadata> = {
  'hedera-account': {
    id: 'hedera-account',
    name: 'Hedera Account',
    icon: 'Wallet',
    color: '#3b82f6',
    description: 'Hedera account operations',
  },
  'hedera-token': {
    id: 'hedera-token',
    name: 'Hedera Token (HTS)',
    icon: 'Coins',
    color: '#8b5cf6',
    description: 'HTS token operations',
  },
  'hedera-consensus': {
    id: 'hedera-consensus',
    name: 'Hedera Consensus (HCS)',
    icon: 'MessageSquare',
    color: '#06b6d4',
    description: 'HCS consensus messaging',
  },
  'hedera-evm': {
    id: 'hedera-evm',
    name: 'Hedera EVM',
    icon: 'FileCode',
    color: '#f97316',
    description: 'EVM smart contracts on Hedera',
  },
  'hedera-schedule': {
    id: 'hedera-schedule',
    name: 'Scheduled Transactions',
    icon: 'Clock',
    color: '#6366f1',
    description: 'Scheduled transactions',
  },
  'defi-saucerswap': {
    id: 'defi-saucerswap',
    name: 'SaucerSwap DEX',
    icon: 'Repeat',
    color: '#22c55e',
    description: 'SaucerSwap DEX operations',
  },
  'defi-bonzo': {
    id: 'defi-bonzo',
    name: 'Bonzo Finance',
    icon: 'Landmark',
    color: '#14b8a6',
    description: 'Bonzo Finance lending & vaults',
  },
  'defi-stader': {
    id: 'defi-stader',
    name: 'Stader Labs',
    icon: 'Layers',
    color: '#84cc16',
    description: 'Stader staking (coming soon)',
  },
  'ai': {
    id: 'ai',
    name: 'AI / LLM',
    icon: 'Brain',
    color: '#f59e0b',
    description: 'AI analysis and decision-making',
  },
  'trigger': {
    id: 'trigger',
    name: 'Triggers',
    icon: 'Zap',
    color: '#7c3aed',
    description: 'Workflow triggers',
  },
  'logic': {
    id: 'logic',
    name: 'Logic & Control',
    icon: 'GitBranch',
    color: '#10b981',
    description: 'Flow control and data transformation',
  },
  'output': {
    id: 'output',
    name: 'Output & Alerts',
    icon: 'Bell',
    color: '#ef4444',
    description: 'Notifications and logging',
  },
};

// Helper functions
export function getComponentById(id: string): ComponentSchema | undefined {
  return ALL_COMPONENTS[id];
}

export function getComponentsByCategory(category: ComponentCategory): ComponentSchema[] {
  return Object.values(COMPONENTS_BY_CATEGORY[category] || {});
}

export function getTriggerComponents(): ComponentSchema[] {
  return Object.values(ALL_COMPONENTS).filter(c => c.isTrigger);
}

export function getHederaComponents(): ComponentSchema[] {
  return Object.values(ALL_COMPONENTS).filter(c => c.type === 'hedera');
}

export function getDeFiComponents(): ComponentSchema[] {
  return Object.values(ALL_COMPONENTS).filter(c => c.type === 'defi');
}

export function getAIComponents(): ComponentSchema[] {
  return Object.values(ALL_COMPONENTS).filter(c => c.type === 'ai');
}

export function getLogicComponents(): ComponentSchema[] {
  return Object.values(ALL_COMPONENTS).filter(c => c.type === 'logic');
}

export function getOutputComponents(): ComponentSchema[] {
  return Object.values(ALL_COMPONENTS).filter(c => c.type === 'output');
}

// Export individual category registries
export {
  HEDERA_ACCOUNT_COMPONENTS,
  HEDERA_TOKEN_COMPONENTS,
  HEDERA_CONSENSUS_COMPONENTS,
  HEDERA_EVM_COMPONENTS,
  HEDERA_SCHEDULE_COMPONENTS,
  DEFI_SAUCERSWAP_COMPONENTS,
  DEFI_BONZO_COMPONENTS,
  AI_COMPONENTS,
  TRIGGER_COMPONENTS,
  LOGIC_COMPONENTS,
  OUTPUT_COMPONENTS,
};
