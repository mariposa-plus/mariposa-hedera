/**
 * Logic Components
 * Components for workflow control flow — branching, transformation, looping, and timing.
 */

import { ComponentSchema } from '@/types';

export const LOGIC_COMPONENTS: Record<string, ComponentSchema> = {
  'condition': {
    id: 'condition',
    name: 'Condition',
    category: 'logic',
    description: 'Route workflow based on a boolean condition — if/else branching',
    icon: 'GitBranch',
    color: '#10b981',
    type: 'logic',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
      hasRightHandle: true,
    },
    configSchema: {
      field: {
        type: 'text',
        label: 'Field',
        placeholder: 'riskScore',
        required: true,
        helpText: 'Field name from input data',
      },
      operator: {
        type: 'select',
        label: 'Operator',
        required: true,
        options: [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not Equals' },
          { value: 'greater_than', label: 'Greater Than' },
          { value: 'less_than', label: 'Less Than' },
          { value: 'greater_equal', label: 'Greater or Equal' },
          { value: 'less_equal', label: 'Less or Equal' },
          { value: 'contains', label: 'Contains' },
          { value: 'not_contains', label: 'Not Contains' },
        ],
      },
      value: {
        type: 'text',
        label: 'Value',
        placeholder: '70',
        required: true,
        helpText: 'Value to compare against',
      },
      dataType: {
        type: 'select',
        label: 'Data Type',
        defaultValue: 'string',
        options: [
          { value: 'string', label: 'String' },
          { value: 'number', label: 'Number' },
          { value: 'boolean', label: 'Boolean' },
        ],
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'data', label: 'Data', type: 'json' },
    ],
    outputs: [
      { id: 'result', label: 'Result', type: 'boolean' },
      { id: 'trueData', label: 'True Data', type: 'json' },
      { id: 'falseData', label: 'False Data', type: 'json' },
    ],
    codeTemplate: 'condition.hbs',
  },

  'data-transform': {
    id: 'data-transform',
    name: 'Data Transform',
    category: 'logic',
    description: 'Transform, filter, or reshape data between nodes',
    icon: 'Shuffle',
    color: '#10b981',
    type: 'logic',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      expression: {
        type: 'textarea',
        label: 'Expression',
        placeholder: 'data.items.map(i => i.value)',
        required: true,
        helpText: 'JavaScript expression to transform input data',
        acceptsInputVariables: true,
      },
      outputKey: {
        type: 'text',
        label: 'Output Key',
        defaultValue: 'result',
        helpText: 'Key name for the transformed output',
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'data', label: 'Data', type: 'json' },
    ],
    outputs: [
      { id: 'result', label: 'Result', type: 'json' },
    ],
    codeTemplate: 'data-transform.hbs',
  },

  'loop': {
    id: 'loop',
    name: 'Loop',
    category: 'logic',
    description: 'Iterate over an array and execute downstream nodes for each item',
    icon: 'Repeat',
    color: '#10b981',
    type: 'logic',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      arrayField: {
        type: 'text',
        label: 'Array Field',
        placeholder: 'items',
        required: true,
        helpText: 'Field name of the array to iterate',
      },
      maxIterations: {
        type: 'number',
        label: 'Max Iterations',
        defaultValue: 100,
        helpText: 'Safety limit for max iterations',
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'data', label: 'Data', type: 'json' },
    ],
    outputs: [
      { id: 'currentItem', label: 'Current Item', type: 'json' },
      { id: 'index', label: 'Index', type: 'number' },
      { id: 'isLast', label: 'Is Last', type: 'boolean' },
    ],
    codeTemplate: 'loop.hbs',
  },

  'delay': {
    id: 'delay',
    name: 'Delay',
    category: 'logic',
    description: 'Pause workflow execution for a specified duration',
    icon: 'Clock',
    color: '#10b981',
    type: 'logic',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      duration: {
        type: 'number',
        label: 'Duration',
        required: true,
        defaultValue: 5,
      },
      unit: {
        type: 'select',
        label: 'Unit',
        required: true,
        defaultValue: 'seconds',
        options: [
          { value: 'seconds', label: 'Seconds' },
          { value: 'minutes', label: 'Minutes' },
          { value: 'hours', label: 'Hours' },
        ],
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
    ],
    outputs: [
      { id: 'resumedAt', label: 'Resumed At', type: 'string' },
    ],
    codeTemplate: 'delay-node.hbs',
  },
};
