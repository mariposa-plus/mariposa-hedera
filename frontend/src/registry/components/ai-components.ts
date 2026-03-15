/**
 * AI / LLM Components
 * Components for AI-powered analysis, risk scoring, and sentiment detection
 * All AI calls go through AWS Bedrock (GPT-OSS models)
 */

import { ComponentSchema } from '@/types';

export const AI_COMPONENTS: Record<string, ComponentSchema> = {
  'llm-analyzer': {
    id: 'llm-analyzer',
    name: 'LLM Analyzer',
    category: 'ai',
    description: 'Send data to an LLM for analysis, decision-making, or content generation',
    icon: 'Brain',
    color: '#f59e0b',
    type: 'ai',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      model: {
        type: 'select',
        label: 'Model',
        defaultValue: 'openai.gpt-oss-120b-1:0',
        required: true,
        options: [
          { value: 'openai.gpt-oss-120b-1:0', label: 'GPT-OSS 120B (best quality)' },
          { value: 'openai.gpt-oss-20b-1:0', label: 'GPT-OSS 20B (faster)' },
        ],
        description: 'Runs on AWS Bedrock.',
      },
      systemPrompt: {
        type: 'textarea',
        label: 'System Prompt',
        placeholder: 'You are a DeFi analyst...',
        required: true,
        helpText: "Define the AI's role and expertise",
      },
      userPrompt: {
        type: 'textarea',
        label: 'User Prompt',
        placeholder: 'Analyze this data: {{data}}',
        required: true,
        acceptsInputVariables: true,
      },
      outputFormat: {
        type: 'select',
        label: 'Output Format',
        defaultValue: 'text',
        required: true,
        options: [
          { value: 'text', label: 'Free Text' },
          { value: 'json', label: 'JSON Structured' },
          { value: 'boolean', label: 'Boolean Decision' },
        ],
      },
      jsonSchema: {
        type: 'json',
        label: 'JSON Schema',
        showWhen: { field: 'outputFormat', value: 'json' },
        helpText: 'Define expected JSON structure',
      },
      temperature: {
        type: 'number',
        label: 'Temperature',
        defaultValue: 0.3,
        validation: { min: 0, max: 2 },
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'data', label: 'Data', type: 'json' },
    ],
    outputs: [
      { id: 'response', label: 'Response', type: 'string' },
      { id: 'structured', label: 'Structured', type: 'json' },
      { id: 'decision', label: 'Decision', type: 'boolean' },
    ],
    codeTemplate: 'llm-analyzer.hbs',
    requiredPackages: ['axios'],
  },

  'risk-scorer': {
    id: 'risk-scorer',
    name: 'Risk Scorer',
    category: 'ai',
    description: 'AI evaluates portfolio risk, volatility, and impermanent loss — outputs score 0-100',
    icon: 'ShieldAlert',
    color: '#f59e0b',
    type: 'ai',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      model: {
        type: 'select',
        label: 'Model',
        defaultValue: 'openai.gpt-oss-120b-1:0',
        required: true,
        options: [
          { value: 'openai.gpt-oss-120b-1:0', label: 'GPT-OSS 120B (best quality)' },
          { value: 'openai.gpt-oss-20b-1:0', label: 'GPT-OSS 20B (faster)' },
        ],
        description: 'Runs on AWS Bedrock.',
      },
      riskThreshold: {
        type: 'number',
        label: 'Risk Threshold',
        defaultValue: 70,
        required: true,
        validation: { min: 0, max: 100 },
        helpText: 'Risk threshold to trigger action above',
      },
      factors: {
        type: 'json',
        label: 'Risk Factors',
        defaultValue: ['volatility', 'impermanent_loss', 'liquidity_depth', 'smart_contract_risk'],
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'portfolioData', label: 'Portfolio Data', type: 'json' },
      { id: 'marketData', label: 'Market Data', type: 'json' },
    ],
    outputs: [
      { id: 'riskScore', label: 'Risk Score', type: 'number' },
      { id: 'analysis', label: 'Analysis', type: 'string' },
      { id: 'recommendation', label: 'Recommendation', type: 'string' },
    ],
    codeTemplate: 'risk-scorer.hbs',
    requiredPackages: ['axios'],
  },

  'sentiment-analyzer': {
    id: 'sentiment-analyzer',
    name: 'Sentiment Analyzer',
    category: 'ai',
    description: 'Analyze news and social feed data for market sentiment — outputs score -100 to +100',
    icon: 'TrendingUp',
    color: '#f59e0b',
    type: 'ai',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      model: {
        type: 'select',
        label: 'Model',
        defaultValue: 'openai.gpt-oss-120b-1:0',
        required: true,
        options: [
          { value: 'openai.gpt-oss-120b-1:0', label: 'GPT-OSS 120B (best quality)' },
          { value: 'openai.gpt-oss-20b-1:0', label: 'GPT-OSS 20B (faster)' },
        ],
        description: 'Runs on AWS Bedrock.',
      },
      sources: {
        type: 'multi-select',
        label: 'Sources',
        helpText: 'Data sources to consider',
        options: [
          { value: 'twitter', label: 'Twitter' },
          { value: 'reddit', label: 'Reddit' },
          { value: 'news', label: 'News' },
          { value: 'discord', label: 'Discord' },
        ],
      },
      threshold: {
        type: 'number',
        label: 'Threshold',
        defaultValue: 50,
        validation: { min: -100, max: 100 },
        helpText: 'Sentiment threshold for action trigger',
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'feedData', label: 'Feed Data', type: 'json' },
    ],
    outputs: [
      { id: 'sentimentScore', label: 'Sentiment Score', type: 'number' },
      { id: 'summary', label: 'Summary', type: 'string' },
      { id: 'signals', label: 'Signals', type: 'json' },
    ],
    codeTemplate: 'sentiment-analyzer.hbs',
    requiredPackages: ['axios'],
  },
};
