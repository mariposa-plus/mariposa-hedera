/**
 * Trigger Components
 * Components that start a workflow execution — the entry points for all pipelines.
 * All triggers have isTrigger: true and only a bottom handle (no input handle).
 */

import { ComponentSchema } from '@/types';

export const TRIGGER_COMPONENTS: Record<string, ComponentSchema> = {
  'cron-trigger': {
    id: 'cron-trigger',
    name: 'Cron Trigger',
    category: 'trigger',
    description: 'Run workflow on a recurring schedule — the heartbeat of keeper agents',
    icon: 'Timer',
    color: '#7c3aed',
    type: 'trigger',
    isTrigger: true,
    handles: {
      hasTopHandle: false,
      hasBottomHandle: true,
    },
    configSchema: {
      schedule: {
        type: 'cron',
        label: 'Schedule',
        placeholder: '*/5 * * * *',
        required: true,
        helpText: 'Cron expression',
      },
      timezone: {
        type: 'text',
        label: 'Timezone',
        defaultValue: 'UTC',
      },
    },
    outputs: [
      { id: 'timestamp', label: 'Timestamp', type: 'string' },
      { id: 'iteration', label: 'Iteration', type: 'number' },
    ],
    codeTemplate: 'cron-trigger.hbs',
    requiredPackages: ['node-cron'],
  },

  'price-threshold': {
    id: 'price-threshold',
    name: 'Price Threshold',
    category: 'trigger',
    description: 'Trigger when a token price crosses a threshold — used for stop-loss and take-profit',
    icon: 'TrendingUp',
    color: '#7c3aed',
    type: 'trigger',
    isTrigger: true,
    handles: {
      hasTopHandle: false,
      hasBottomHandle: true,
    },
    configSchema: {
      tokenId: {
        type: 'token-id',
        label: 'Token ID',
        required: true,
      },
      targetPrice: {
        type: 'number',
        label: 'Target Price',
        required: true,
      },
      direction: {
        type: 'select',
        label: 'Direction',
        required: true,
        defaultValue: 'above',
        options: [
          { value: 'above', label: 'Above' },
          { value: 'below', label: 'Below' },
        ],
      },
      checkIntervalSeconds: {
        type: 'number',
        label: 'Check Interval (seconds)',
        defaultValue: 30,
        helpText: 'How often to check price',
      },
    },
    outputs: [
      { id: 'currentPrice', label: 'Current Price', type: 'number' },
      { id: 'targetPrice', label: 'Target Price', type: 'number' },
      { id: 'timestamp', label: 'Timestamp', type: 'string' },
    ],
    codeTemplate: 'price-threshold.hbs',
    requiredPackages: ['axios'],
  },

  'webhook-trigger': {
    id: 'webhook-trigger',
    name: 'Webhook Trigger',
    category: 'trigger',
    description: 'Start workflow from an external HTTP POST request',
    icon: 'Globe',
    color: '#7c3aed',
    type: 'trigger',
    isTrigger: true,
    handles: {
      hasTopHandle: false,
      hasBottomHandle: true,
    },
    configSchema: {
      path: {
        type: 'text',
        label: 'Path',
        placeholder: '/webhook/my-workflow',
        required: true,
        helpText: 'Webhook endpoint path',
      },
      secret: {
        type: 'password',
        label: 'Secret',
        helpText: 'Optional webhook secret for validation',
      },
    },
    outputs: [
      { id: 'payload', label: 'Payload', type: 'json' },
      { id: 'headers', label: 'Headers', type: 'json' },
      { id: 'timestamp', label: 'Timestamp', type: 'string' },
    ],
    codeTemplate: 'webhook-trigger.hbs',
    requiredPackages: ['express'],
  },

  'hcs-event-trigger': {
    id: 'hcs-event-trigger',
    name: 'HCS Event Trigger',
    category: 'trigger',
    description: 'Trigger when a new message appears on an HCS topic',
    icon: 'Radio',
    color: '#7c3aed',
    type: 'trigger',
    isTrigger: true,
    handles: {
      hasTopHandle: false,
      hasBottomHandle: true,
    },
    configSchema: {
      topicId: {
        type: 'topic-id',
        label: 'Topic ID',
        required: true,
      },
      filterPattern: {
        type: 'text',
        label: 'Filter Pattern',
        helpText: 'Optional regex to filter messages',
      },
      pollingIntervalSeconds: {
        type: 'number',
        label: 'Polling Interval (seconds)',
        defaultValue: 10,
      },
    },
    outputs: [
      { id: 'message', label: 'Message', type: 'string' },
      { id: 'sequenceNumber', label: 'Sequence Number', type: 'number' },
      { id: 'timestamp', label: 'Timestamp', type: 'string' },
    ],
    requiredPlugins: ['coreConsensusQueryPlugin'],
    codeTemplate: 'hcs-event-trigger.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },
};
