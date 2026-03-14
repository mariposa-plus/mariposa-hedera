/**
 * Hedera Consensus Service (HCS) Components
 * Components for creating topics, submitting messages, and querying HCS data
 */

import { ComponentSchema } from '@/types';

export const HEDERA_CONSENSUS_COMPONENTS: Record<string, ComponentSchema> = {
  'create-topic': {
    id: 'create-topic',
    name: 'Create Topic',
    category: 'hedera-consensus',
    description: 'Create a new HCS topic for immutable message logging and agent audit trails',
    icon: 'MessageSquarePlus',
    color: '#06b6d4',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      memo: {
        type: 'text',
        label: 'Topic Memo',
        placeholder: 'Agent execution log',
        helpText: 'Descriptive memo for the topic',
      },
      adminKey: {
        type: 'toggle',
        label: 'Set Admin Key',
        defaultValue: true,
        helpText: 'Set admin key (allows deletion)',
      },
    },
    outputs: [
      { id: 'topicId', label: 'Topic ID', type: 'topic' },
    ],
    requiredPlugins: ['coreConsensusPlugin'],
    requiredTools: ['CREATE_TOPIC_TOOL'],
    codeTemplate: 'create-topic.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },

  'submit-message': {
    id: 'submit-message',
    name: 'Submit Message',
    category: 'hedera-consensus',
    description: 'Post a message to an HCS topic — used for on-chain agent logging',
    icon: 'MessageSquare',
    color: '#06b6d4',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      topicId: {
        type: 'topic-id',
        label: 'Topic ID',
        placeholder: '0.0.xxxxx',
        required: true,
        helpText: 'HCS topic to post the message to',
      },
      message: {
        type: 'textarea',
        label: 'Message',
        placeholder: 'Agent action log entry...',
        required: true,
        helpText: 'Can reference output from previous nodes using {{nodeId.outputName}}',
        acceptsInputVariables: true,
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'topicId', label: 'Topic ID', type: 'topic' },
      { id: 'message', label: 'Message', type: 'string' },
    ],
    outputs: [
      { id: 'sequenceNumber', label: 'Sequence Number', type: 'number' },
      { id: 'transactionId', label: 'Transaction ID', type: 'transaction' },
    ],
    requiredPlugins: ['coreConsensusPlugin'],
    requiredTools: ['SUBMIT_MESSAGE_TOOL'],
    codeTemplate: 'submit-message.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },

  'query-messages': {
    id: 'query-messages',
    name: 'Query Messages',
    category: 'hedera-consensus',
    description: 'Retrieve and filter messages from an HCS topic',
    icon: 'ListFilter',
    color: '#06b6d4',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      topicId: {
        type: 'topic-id',
        label: 'Topic ID',
        placeholder: '0.0.xxxxx',
        required: true,
        helpText: 'HCS topic to query messages from',
      },
      fromSequence: {
        type: 'number',
        label: 'From Sequence Number',
        helpText: 'Filter messages from this sequence number onwards',
      },
      limit: {
        type: 'number',
        label: 'Limit',
        defaultValue: 100,
        helpText: 'Maximum number of messages to return',
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'topicId', label: 'Topic ID', type: 'topic' },
    ],
    outputs: [
      { id: 'messages', label: 'Messages', type: 'json' },
      { id: 'count', label: 'Message Count', type: 'number' },
    ],
    requiredPlugins: ['coreConsensusQueryPlugin'],
    requiredTools: ['GET_TOPIC_MESSAGES_QUERY_TOOL'],
    codeTemplate: 'query-messages.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },
};
