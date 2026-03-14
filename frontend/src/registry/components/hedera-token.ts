/**
 * Hedera Token (HTS) Components
 * Components for creating, minting, transferring, and managing HTS tokens and NFTs
 */

import { ComponentSchema } from '@/types';

export const HEDERA_TOKEN_COMPONENTS: Record<string, ComponentSchema> = {
  'create-fungible-token': {
    id: 'create-fungible-token',
    name: 'Create Fungible Token',
    category: 'hedera-token',
    description: 'Create a new HTS fungible token with name, symbol, supply, and decimals',
    icon: 'Coins',
    color: '#8b5cf6',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      name: {
        type: 'text',
        label: 'Token Name',
        placeholder: 'My Token',
        required: true,
        helpText: 'Display name for the token',
      },
      symbol: {
        type: 'text',
        label: 'Token Symbol',
        placeholder: 'MTK',
        required: true,
        helpText: 'Short ticker symbol (e.g., HBAR, USDC)',
      },
      decimals: {
        type: 'number',
        label: 'Decimals',
        defaultValue: 2,
        required: true,
        validation: { min: 0, max: 18 },
        helpText: 'Number of decimal places (0-18)',
      },
      initialSupply: {
        type: 'number',
        label: 'Initial Supply',
        required: true,
        helpText: 'Initial token supply (in smallest unit)',
      },
      supplyType: {
        type: 'select',
        label: 'Supply Type',
        defaultValue: 'infinite',
        required: true,
        options: [
          { value: 'infinite', label: 'Infinite' },
          { value: 'finite', label: 'Finite' },
        ],
        helpText: 'Whether the token has a fixed or unlimited supply',
      },
      treasuryAccountId: {
        type: 'account-id',
        label: 'Treasury Account',
        placeholder: '0.0.xxxxx',
        helpText: 'Leave empty for operator account',
      },
    },
    outputs: [
      { id: 'tokenId', label: 'Token ID', type: 'token' },
      { id: 'transactionId', label: 'Transaction ID', type: 'transaction' },
    ],
    requiredPlugins: ['coreTokenPlugin'],
    requiredTools: ['CREATE_FUNGIBLE_TOKEN_TOOL'],
    codeTemplate: 'create-fungible-token.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },

  'mint-token': {
    id: 'mint-token',
    name: 'Mint Token',
    category: 'hedera-token',
    description: 'Mint additional supply of an existing fungible token',
    icon: 'Plus',
    color: '#8b5cf6',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      tokenId: {
        type: 'token-id',
        label: 'Token ID',
        placeholder: '0.0.xxxxx',
        required: true,
        helpText: 'Token to mint additional supply for',
      },
      amount: {
        type: 'number',
        label: 'Amount',
        required: true,
        helpText: 'Amount of tokens to mint (in smallest unit)',
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'tokenId', label: 'Token ID', type: 'token' },
    ],
    outputs: [
      { id: 'newSupply', label: 'New Total Supply', type: 'number' },
      { id: 'transactionId', label: 'Transaction ID', type: 'transaction' },
    ],
    requiredPlugins: ['coreTokenPlugin'],
    requiredTools: ['MINT_FUNGIBLE_TOKEN_TOOL'],
    codeTemplate: 'mint-token.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },

  'transfer-token': {
    id: 'transfer-token',
    name: 'Transfer Token',
    category: 'hedera-token',
    description: 'Transfer HTS tokens between accounts',
    icon: 'ArrowRightLeft',
    color: '#8b5cf6',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      tokenId: {
        type: 'token-id',
        label: 'Token ID',
        placeholder: '0.0.xxxxx',
        required: true,
        helpText: 'Token to transfer',
      },
      toAccountId: {
        type: 'account-id',
        label: 'To Account ID',
        placeholder: '0.0.xxxxx',
        required: true,
        helpText: 'Recipient account',
      },
      amount: {
        type: 'number',
        label: 'Amount',
        required: true,
        helpText: 'Amount of tokens to transfer (in smallest unit)',
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'tokenId', label: 'Token ID', type: 'token' },
      { id: 'toAccountId', label: 'To Account ID', type: 'account' },
    ],
    outputs: [
      { id: 'transactionId', label: 'Transaction ID', type: 'transaction' },
      { id: 'status', label: 'Status', type: 'string' },
    ],
    requiredPlugins: ['coreTokenPlugin'],
    requiredTools: ['TRANSFER_TOKEN_TOOL'],
    codeTemplate: 'transfer-token.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },

  'query-token-info': {
    id: 'query-token-info',
    name: 'Query Token Info',
    category: 'hedera-token',
    description: 'Get token metadata, supply, holders from mirror node',
    icon: 'Info',
    color: '#8b5cf6',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      tokenId: {
        type: 'token-id',
        label: 'Token ID',
        placeholder: '0.0.xxxxx',
        required: true,
        helpText: 'Token to query information for',
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'tokenId', label: 'Token ID', type: 'token' },
    ],
    outputs: [
      { id: 'tokenInfo', label: 'Token Info', type: 'json' },
      { id: 'totalSupply', label: 'Total Supply', type: 'number' },
    ],
    requiredPlugins: ['coreTokenQueryPlugin'],
    requiredTools: ['GET_TOKEN_INFO_QUERY_TOOL'],
    codeTemplate: 'query-token-info.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },

  'associate-token': {
    id: 'associate-token',
    name: 'Associate Token',
    category: 'hedera-token',
    description: 'Associate an account with a token (required before receiving tokens)',
    icon: 'Link',
    color: '#8b5cf6',
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
        helpText: 'Account to associate with the token',
      },
      tokenId: {
        type: 'token-id',
        label: 'Token ID',
        placeholder: '0.0.xxxxx',
        required: true,
        helpText: 'Token to associate',
      },
    },
    outputs: [
      { id: 'status', label: 'Status', type: 'string' },
    ],
    requiredPlugins: ['coreTokenPlugin'],
    requiredTools: ['ASSOCIATE_TOKEN_TOOL'],
    codeTemplate: 'associate-token.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },

  'create-nft': {
    id: 'create-nft',
    name: 'Create NFT Collection',
    category: 'hedera-token',
    description: 'Create a non-fungible token collection on HTS',
    icon: 'Image',
    color: '#8b5cf6',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      name: {
        type: 'text',
        label: 'Collection Name',
        placeholder: 'My NFT Collection',
        required: true,
        helpText: 'Display name for the NFT collection',
      },
      symbol: {
        type: 'text',
        label: 'Collection Symbol',
        placeholder: 'MNFT',
        required: true,
        helpText: 'Short symbol for the collection',
      },
      maxSupply: {
        type: 'number',
        label: 'Max Supply',
        defaultValue: 0,
        helpText: '0 = infinite',
      },
    },
    outputs: [
      { id: 'tokenId', label: 'Token ID', type: 'token' },
    ],
    requiredPlugins: ['coreTokenPlugin'],
    requiredTools: ['CREATE_NFT_TOOL'],
    codeTemplate: 'create-nft.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },

  'mint-nft': {
    id: 'mint-nft',
    name: 'Mint NFT',
    category: 'hedera-token',
    description: 'Mint a new NFT with metadata to an existing collection',
    icon: 'Stamp',
    color: '#8b5cf6',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      tokenId: {
        type: 'token-id',
        label: 'Collection Token ID',
        placeholder: '0.0.xxxxx',
        required: true,
        helpText: 'NFT collection to mint into',
      },
      metadata: {
        type: 'text',
        label: 'Metadata URI',
        placeholder: 'ipfs://...',
        required: true,
        helpText: 'Metadata URI for the NFT (e.g., IPFS link)',
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'tokenId', label: 'Token ID', type: 'token' },
    ],
    outputs: [
      { id: 'serialNumber', label: 'Serial Number', type: 'number' },
      { id: 'transactionId', label: 'Transaction ID', type: 'transaction' },
    ],
    requiredPlugins: ['coreTokenPlugin'],
    requiredTools: ['MINT_NFT_TOOL'],
    codeTemplate: 'mint-nft.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },

  'approve-allowance': {
    id: 'approve-allowance',
    name: 'Approve Allowance',
    category: 'hedera-token',
    description: 'Approve token spend allowance for DeFi interactions',
    icon: 'ShieldCheck',
    color: '#8b5cf6',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      tokenId: {
        type: 'token-id',
        label: 'Token ID',
        placeholder: '0.0.xxxxx',
        required: true,
        helpText: 'Token to approve spending for',
      },
      spenderAccountId: {
        type: 'account-id',
        label: 'Spender Account ID',
        placeholder: '0.0.xxxxx',
        required: true,
        helpText: 'Account allowed to spend tokens',
      },
      amount: {
        type: 'number',
        label: 'Allowance Amount',
        required: true,
        helpText: 'Maximum amount the spender can transfer',
      },
    },
    outputs: [
      { id: 'status', label: 'Status', type: 'string' },
    ],
    requiredPlugins: ['coreTokenPlugin'],
    requiredTools: ['APPROVE_ALLOWANCE_TOOL'],
    codeTemplate: 'approve-allowance.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },
};
