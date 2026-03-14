/**
 * Output Components
 * Components that deliver workflow results — on-chain logging, alerts, and notifications.
 */

import { ComponentSchema } from '@/types';

export const OUTPUT_COMPONENTS: Record<string, ComponentSchema> = {
  'hcs-log': {
    id: 'hcs-log',
    name: 'HCS Log',
    category: 'output',
    description: 'Log workflow results to an HCS topic for permanent on-chain audit trail',
    icon: 'FileText',
    color: '#ef4444',
    type: 'output',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      topicId: {
        type: 'topic-id',
        label: 'Topic ID',
        required: true,
      },
      messageTemplate: {
        type: 'textarea',
        label: 'Message Template',
        placeholder: 'Workflow completed: {{result}}',
        required: true,
        acceptsInputVariables: true,
        helpText: 'Use {{varName}} to inject data from previous nodes',
      },
      includeTimestamp: {
        type: 'toggle',
        label: 'Include Timestamp',
        defaultValue: true,
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'data', label: 'Data', type: 'json' },
    ],
    outputs: [
      { id: 'sequenceNumber', label: 'Sequence Number', type: 'number' },
      { id: 'transactionId', label: 'Transaction ID', type: 'transaction' },
    ],
    requiredPlugins: ['coreConsensusPlugin'],
    requiredTools: ['SUBMIT_MESSAGE_TOOL'],
    codeTemplate: 'hcs-log.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },

  'telegram-alert': {
    id: 'telegram-alert',
    name: 'Telegram Alert',
    category: 'output',
    description: 'Send alert message to a Telegram chat or group',
    icon: 'Send',
    color: '#ef4444',
    type: 'output',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      botToken: {
        type: 'password',
        label: 'Bot Token',
        required: true,
        helpText: 'Telegram bot token from @BotFather',
      },
      chatId: {
        type: 'text',
        label: 'Chat ID',
        required: true,
        helpText: 'Telegram chat ID',
      },
      messageTemplate: {
        type: 'textarea',
        label: 'Message Template',
        placeholder: 'Alert: {{message}}',
        required: true,
        acceptsInputVariables: true,
      },
      parseMode: {
        type: 'select',
        label: 'Parse Mode',
        defaultValue: 'HTML',
        options: [
          { value: 'HTML', label: 'HTML' },
          { value: 'Markdown', label: 'Markdown' },
          { value: 'None', label: 'None' },
        ],
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'data', label: 'Data', type: 'json' },
    ],
    outputs: [
      { id: 'messageId', label: 'Message ID', type: 'string' },
      { id: 'status', label: 'Status', type: 'string' },
    ],
    codeTemplate: 'telegram-alert.hbs',
    requiredPackages: ['axios'],
  },

  'discord-alert': {
    id: 'discord-alert',
    name: 'Discord Alert',
    category: 'output',
    description: 'Send alert to a Discord channel via webhook',
    icon: 'MessageCircle',
    color: '#ef4444',
    type: 'output',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      webhookUrl: {
        type: 'password',
        label: 'Webhook URL',
        required: true,
        helpText: 'Discord webhook URL',
      },
      messageTemplate: {
        type: 'textarea',
        label: 'Message Template',
        placeholder: 'Alert: {{message}}',
        required: true,
        acceptsInputVariables: true,
      },
      username: {
        type: 'text',
        label: 'Username',
        defaultValue: 'Mariposa Bot',
      },
      embedColor: {
        type: 'text',
        label: 'Embed Color',
        defaultValue: '#ff0000',
        helpText: 'Hex color for embed sidebar',
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'data', label: 'Data', type: 'json' },
    ],
    outputs: [
      { id: 'messageId', label: 'Message ID', type: 'string' },
      { id: 'status', label: 'Status', type: 'string' },
    ],
    codeTemplate: 'discord-alert.hbs',
    requiredPackages: ['axios'],
  },

  'email-notification': {
    id: 'email-notification',
    name: 'Email Notification',
    category: 'output',
    description: 'Send email notification with workflow results',
    icon: 'Mail',
    color: '#ef4444',
    type: 'output',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      to: {
        type: 'text',
        label: 'To',
        placeholder: 'user@example.com',
        required: true,
      },
      subject: {
        type: 'text',
        label: 'Subject',
        placeholder: 'Workflow Alert: {{workflowName}}',
        required: true,
        acceptsInputVariables: true,
      },
      bodyTemplate: {
        type: 'textarea',
        label: 'Body Template',
        placeholder: 'Workflow completed with result: {{result}}',
        required: true,
        acceptsInputVariables: true,
      },
      isHtml: {
        type: 'toggle',
        label: 'HTML Email',
        defaultValue: false,
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'data', label: 'Data', type: 'json' },
    ],
    outputs: [
      { id: 'messageId', label: 'Message ID', type: 'string' },
      { id: 'status', label: 'Status', type: 'string' },
    ],
    codeTemplate: 'email-notification.hbs',
    requiredPackages: ['nodemailer'],
  },
};
