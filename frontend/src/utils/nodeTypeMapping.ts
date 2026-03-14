/**
 * Node Type Mapping Utility
 * Maps NodeType to React component for rendering in pipeline
 * All Hedera components use GenericNode
 */

import { GenericNode } from '@/components/nodes/GenericNode';

export const createNodeTypes = () => ({
  // Hedera Account
  'create-account': GenericNode,
  'transfer-hbar': GenericNode,
  'query-balance': GenericNode,
  'update-account': GenericNode,

  // Hedera Token (HTS)
  'create-fungible-token': GenericNode,
  'mint-token': GenericNode,
  'transfer-token': GenericNode,
  'query-token-info': GenericNode,
  'associate-token': GenericNode,
  'create-nft': GenericNode,
  'mint-nft': GenericNode,
  'approve-allowance': GenericNode,

  // Hedera Consensus (HCS)
  'create-topic': GenericNode,
  'submit-message': GenericNode,
  'query-messages': GenericNode,

  // Hedera EVM
  'deploy-erc20': GenericNode,
  'deploy-erc721': GenericNode,
  'call-contract': GenericNode,
  'query-contract': GenericNode,

  // Hedera Schedule
  'schedule-transaction': GenericNode,

  // DeFi — SaucerSwap
  'saucerswap-swap': GenericNode,
  'query-pool': GenericNode,
  'add-liquidity': GenericNode,
  'remove-liquidity': GenericNode,

  // DeFi — Bonzo
  'bonzo-deposit': GenericNode,
  'bonzo-withdraw': GenericNode,
  'bonzo-borrow': GenericNode,
  'bonzo-repay': GenericNode,
  'query-vault-position': GenericNode,

  // AI / LLM
  'llm-analyzer': GenericNode,
  'risk-scorer': GenericNode,
  'sentiment-analyzer': GenericNode,

  // Triggers
  'cron-trigger': GenericNode,
  'price-threshold': GenericNode,
  'webhook-trigger': GenericNode,
  'hcs-event-trigger': GenericNode,

  // Logic
  'condition': GenericNode,
  'data-transform': GenericNode,
  'loop': GenericNode,
  'delay': GenericNode,

  // Output
  'hcs-log': GenericNode,
  'telegram-alert': GenericNode,
  'discord-alert': GenericNode,
  'email-notification': GenericNode,
});

export const nodeTypes = createNodeTypes();
