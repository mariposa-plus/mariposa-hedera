/**
 * DeFi Bonzo Finance Components
 * Components for interacting with Bonzo Finance vaults and lending on Hedera
 */

import { ComponentSchema } from '@/types';

export const DEFI_BONZO_COMPONENTS: Record<string, ComponentSchema> = {
  'bonzo-deposit': {
    id: 'bonzo-deposit',
    name: 'Bonzo Deposit',
    category: 'defi-bonzo',
    description: 'Deposit assets into a Bonzo Finance vault strategy',
    icon: 'ArrowDownToLine',
    color: '#14b8a6',
    type: 'defi',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      vaultAddress: {
        type: 'address',
        label: 'Vault Address',
        required: true,
      },
      tokenId: {
        type: 'token-id',
        label: 'Token ID',
        placeholder: '0.0.456858 (USDC)',
        required: true,
      },
      amount: {
        type: 'number',
        label: 'Amount',
        required: true,
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'amount', label: 'Amount', type: 'number' },
    ],
    outputs: [
      { id: 'shares', label: 'Shares', type: 'number' },
      { id: 'transactionId', label: 'Transaction ID', type: 'transaction' },
    ],
    codeTemplate: 'bonzo-deposit.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk', 'viem'],
  },

  'bonzo-withdraw': {
    id: 'bonzo-withdraw',
    name: 'Bonzo Withdraw',
    category: 'defi-bonzo',
    description: 'Withdraw assets from a Bonzo Finance vault',
    icon: 'ArrowUpFromLine',
    color: '#14b8a6',
    type: 'defi',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      vaultAddress: {
        type: 'address',
        label: 'Vault Address',
        required: true,
      },
      shares: {
        type: 'number',
        label: 'Shares',
        defaultValue: 0,
        required: true,
        helpText: 'Shares to redeem (0 = all)',
      },
    },
    outputs: [
      { id: 'amountReceived', label: 'Amount Received', type: 'number' },
      { id: 'transactionId', label: 'Transaction ID', type: 'transaction' },
    ],
    codeTemplate: 'bonzo-withdraw.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk', 'viem'],
  },

  'bonzo-borrow': {
    id: 'bonzo-borrow',
    name: 'Bonzo Borrow',
    category: 'defi-bonzo',
    description: 'Borrow assets from Bonzo Lend market using collateral',
    icon: 'Landmark',
    color: '#14b8a6',
    type: 'defi',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      tokenId: {
        type: 'token-id',
        label: 'Token ID',
        required: true,
      },
      amount: {
        type: 'number',
        label: 'Amount',
        required: true,
      },
    },
    outputs: [
      { id: 'borrowedAmount', label: 'Borrowed Amount', type: 'number' },
      { id: 'transactionId', label: 'Transaction ID', type: 'transaction' },
    ],
    codeTemplate: 'bonzo-borrow.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk', 'viem'],
  },

  'bonzo-repay': {
    id: 'bonzo-repay',
    name: 'Bonzo Repay',
    category: 'defi-bonzo',
    description: 'Repay borrowed assets to Bonzo Lend market',
    icon: 'CircleDollarSign',
    color: '#14b8a6',
    type: 'defi',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      tokenId: {
        type: 'token-id',
        label: 'Token ID',
        required: true,
      },
      amount: {
        type: 'number',
        label: 'Amount',
        required: true,
        helpText: 'Amount to repay (0 = repay all)',
      },
    },
    outputs: [
      { id: 'repaidAmount', label: 'Repaid Amount', type: 'number' },
      { id: 'transactionId', label: 'Transaction ID', type: 'transaction' },
    ],
    codeTemplate: 'bonzo-repay.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk', 'viem'],
  },

  'query-vault-position': {
    id: 'query-vault-position',
    name: 'Query Vault Position',
    category: 'defi-bonzo',
    description: 'Check vault share balance, accrued yield, and strategy status',
    icon: 'PieChart',
    color: '#14b8a6',
    type: 'defi',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      vaultAddress: {
        type: 'address',
        label: 'Vault Address',
        required: true,
      },
      accountAddress: {
        type: 'address',
        label: 'Account Address',
        helpText: 'Leave empty for operator',
      },
    },
    outputs: [
      { id: 'shares', label: 'Shares', type: 'number' },
      { id: 'underlyingValue', label: 'Underlying Value', type: 'number' },
      { id: 'yieldAccrued', label: 'Yield Accrued', type: 'number' },
      { id: 'positionData', label: 'Position Data', type: 'json' },
    ],
    requiredPlugins: ['coreEVMQueryPlugin'],
    codeTemplate: 'query-vault-position.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk', 'viem'],
  },
};
