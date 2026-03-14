/**
 * Hedera Schedule Components
 * Components for creating and managing scheduled transactions on Hedera
 */

import { ComponentSchema } from '@/types';

export const HEDERA_SCHEDULE_COMPONENTS: Record<string, ComponentSchema> = {
  'schedule-transaction': {
    id: 'schedule-transaction',
    name: 'Schedule Transaction',
    category: 'hedera-schedule',
    description: 'Create a future-dated transaction using Hedera scheduled transactions',
    icon: 'Clock',
    color: '#6366f1',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      transactionType: {
        type: 'select',
        label: 'Transaction Type',
        required: true,
        options: [
          { value: 'transferHbar', label: 'Transfer HBAR' },
          { value: 'transferToken', label: 'Transfer Token' },
          { value: 'contractCall', label: 'Contract Call' },
        ],
      },
      expirationTime: {
        type: 'text',
        label: 'Expiration Time',
        placeholder: '2026-04-01T10:00:00Z',
        required: true,
      },
      waitForExpiry: {
        type: 'toggle',
        label: 'Wait For Expiry',
        defaultValue: false,
      },
      params: {
        type: 'json',
        label: 'Transaction Parameters',
        required: true,
        helpText: 'Parameters specific to the transaction type',
      },
    },
    outputs: [
      { id: 'scheduleId', label: 'Schedule ID', type: 'string' },
    ],
    requiredPlugins: ['coreAccountPlugin'],
    codeTemplate: 'schedule-transaction.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },
};
