/**
 * Hedera Account Components
 * Components for creating, querying, and managing Hedera accounts
 */

import { ComponentSchema } from '@/types';

export const HEDERA_ACCOUNT_COMPONENTS: Record<string, ComponentSchema> = {
  'create-account': {
    id: 'create-account',
    name: 'Create Account',
    category: 'hedera-account',
    description: 'Create a new Hedera account with optional initial balance and memo',
    icon: 'UserPlus',
    color: '#3b82f6',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      initialBalance: {
        type: 'number',
        label: 'Initial Balance (HBAR)',
        defaultValue: 10,
        helpText: 'Initial HBAR balance to fund the new account',
      },
      memo: {
        type: 'text',
        label: 'Account Memo',
        placeholder: 'New Hedera account',
        helpText: 'Optional memo to attach to the account',
      },
      maxAutoAssociations: {
        type: 'number',
        label: 'Max Auto Associations',
        defaultValue: -1,
        helpText: '-1 for unlimited',
      },
    },
    outputs: [
      { id: 'accountId', label: 'Account ID', type: 'account' },
      { id: 'privateKey', label: 'Private Key', type: 'string' },
    ],
    requiredPlugins: ['coreAccountPlugin'],
    requiredTools: ['CREATE_ACCOUNT_TOOL'],
    codeTemplate: 'create-account.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },

  'transfer-hbar': {
    id: 'transfer-hbar',
    name: 'Transfer HBAR',
    category: 'hedera-account',
    description: 'Send HBAR from operator account to a target account',
    icon: 'Send',
    color: '#3b82f6',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      toAccountId: {
        type: 'account-id',
        label: 'To Account ID',
        placeholder: '0.0.xxxxx',
        required: true,
        helpText: 'Target account to receive HBAR',
      },
      amount: {
        type: 'number',
        label: 'Amount (HBAR)',
        required: true,
        helpText: 'Amount of HBAR to transfer',
      },
      memo: {
        type: 'text',
        label: 'Transfer Memo',
        placeholder: 'Payment for...',
        helpText: 'Optional memo to attach to the transfer',
      },
      isScheduled: {
        type: 'toggle',
        label: 'Schedule Transaction',
        defaultValue: false,
        helpText: 'Schedule the transfer for later execution',
      },
      scheduledExpiry: {
        type: 'text',
        label: 'Scheduled Expiry',
        placeholder: '2025-12-31T23:59:59Z',
        helpText: 'Expiry time for the scheduled transaction',
        showWhen: { field: 'isScheduled', value: true },
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'toAccountId', label: 'To Account ID', type: 'account' },
    ],
    outputs: [
      { id: 'transactionId', label: 'Transaction ID', type: 'transaction' },
      { id: 'status', label: 'Status', type: 'string' },
    ],
    requiredPlugins: ['coreAccountPlugin'],
    requiredTools: ['TRANSFER_HBAR_TOOL'],
    codeTemplate: 'transfer-hbar.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },

  'query-balance': {
    id: 'query-balance',
    name: 'Query Balance',
    category: 'hedera-account',
    description: 'Get HBAR and token balances for any Hedera account',
    icon: 'Search',
    color: '#3b82f6',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      accountId: {
        type: 'account-id',
        label: 'Account ID',
        placeholder: '0.0.xxxxx',
        required: true,
        helpText: 'Leave empty to query operator account',
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'accountId', label: 'Account ID', type: 'account' },
    ],
    outputs: [
      { id: 'hbarBalance', label: 'HBAR Balance', type: 'number' },
      { id: 'tokenBalances', label: 'Token Balances', type: 'json' },
    ],
    requiredPlugins: ['coreAccountQueryPlugin'],
    requiredTools: ['GET_HBAR_BALANCE_QUERY_TOOL'],
    codeTemplate: 'query-balance.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },

  'update-account': {
    id: 'update-account',
    name: 'Update Account',
    category: 'hedera-account',
    description: 'Update account properties like memo, auto-associations, or keys',
    icon: 'UserCog',
    color: '#3b82f6',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      accountId: {
        type: 'account-id',
        label: 'Account ID',
        placeholder: '0.0.xxxxx',
        required: true,
        helpText: 'Account to update',
      },
      memo: {
        type: 'text',
        label: 'New Memo',
        placeholder: 'Updated memo...',
        helpText: 'New memo for the account',
      },
      maxAutoAssociations: {
        type: 'number',
        label: 'Max Auto Associations',
        helpText: '-1 for unlimited, 0 to disable',
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'accountId', label: 'Account ID', type: 'account' },
    ],
    outputs: [
      { id: 'status', label: 'Status', type: 'string' },
    ],
    requiredPlugins: ['coreAccountPlugin'],
    requiredTools: ['UPDATE_ACCOUNT_TOOL'],
    codeTemplate: 'update-account.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },
};
