/**
 * Hedera EVM Components
 * Components for deploying and interacting with EVM smart contracts on Hedera
 */

import { ComponentSchema } from '@/types';

export const HEDERA_EVM_COMPONENTS: Record<string, ComponentSchema> = {
  'deploy-erc20': {
    id: 'deploy-erc20',
    name: 'Deploy ERC-20',
    category: 'hedera-evm',
    description: 'Deploy a fungible token via EVM factory on Hedera',
    icon: 'FileCode',
    color: '#f97316',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      name: {
        type: 'text',
        label: 'Token Name',
        placeholder: 'My ERC-20 Token',
        required: true,
        helpText: 'Display name for the ERC-20 token',
      },
      symbol: {
        type: 'text',
        label: 'Token Symbol',
        placeholder: 'MTK',
        required: true,
        helpText: 'Short ticker symbol',
      },
      initialSupply: {
        type: 'number',
        label: 'Initial Supply',
        required: true,
        helpText: 'Initial token supply to mint',
      },
      customContract: {
        type: 'toggle',
        label: 'Use Custom Contract',
        defaultValue: false,
        helpText: 'Provide your own Solidity ERC-20 contract',
      },
      contractSource: {
        type: 'code',
        label: 'Contract Source',
        helpText: 'Write or paste your Solidity contract',
        showWhen: { field: 'customContract', value: true },
      },
    },
    outputs: [
      { id: 'contractAddress', label: 'Contract Address', type: 'address' },
      { id: 'transactionId', label: 'Transaction ID', type: 'transaction' },
    ],
    requiredPlugins: ['coreEVMPlugin'],
    requiredTools: ['DEPLOY_ERC20_TOOL'],
    codeTemplate: 'deploy-erc20.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },

  'deploy-erc721': {
    id: 'deploy-erc721',
    name: 'Deploy ERC-721',
    category: 'hedera-evm',
    description: 'Deploy an NFT contract via EVM factory on Hedera',
    icon: 'Image',
    color: '#f97316',
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
        helpText: 'Display name for the ERC-721 collection',
      },
      symbol: {
        type: 'text',
        label: 'Collection Symbol',
        placeholder: 'MNFT',
        required: true,
        helpText: 'Short symbol for the collection',
      },
      baseURI: {
        type: 'text',
        label: 'Base URI',
        placeholder: 'ipfs://...',
        helpText: 'Base URI for token metadata',
      },
      customContract: {
        type: 'toggle',
        label: 'Use Custom Contract',
        defaultValue: false,
        helpText: 'Provide your own Solidity ERC-721 contract',
      },
      contractSource: {
        type: 'code',
        label: 'Contract Source',
        helpText: 'Write or paste your Solidity contract',
        showWhen: { field: 'customContract', value: true },
      },
    },
    outputs: [
      { id: 'contractAddress', label: 'Contract Address', type: 'address' },
    ],
    requiredPlugins: ['coreEVMPlugin'],
    requiredTools: ['DEPLOY_ERC721_TOOL'],
    codeTemplate: 'deploy-erc721.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },

  'call-contract': {
    id: 'call-contract',
    name: 'Call Contract',
    category: 'hedera-evm',
    description: 'Execute a read or write function on any EVM smart contract on Hedera',
    icon: 'Terminal',
    color: '#f97316',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      contractAddress: {
        type: 'address',
        label: 'Contract Address',
        placeholder: '0x...',
        required: true,
        helpText: 'Address of the deployed smart contract',
      },
      abi: {
        type: 'json',
        label: 'Contract ABI',
        placeholder: '[{"type": "function", "name": "..."}]',
        required: true,
        helpText: 'Paste the ABI array',
      },
      functionName: {
        type: 'text',
        label: 'Function Name',
        placeholder: 'balanceOf',
        required: true,
        helpText: 'Name of the contract function to call',
      },
      args: {
        type: 'json',
        label: 'Function Arguments',
        placeholder: '["0x...", 100]',
        defaultValue: [],
        helpText: 'JSON array of arguments to pass to the function',
      },
      isReadOnly: {
        type: 'toggle',
        label: 'Read-Only Call',
        defaultValue: false,
        required: true,
        helpText: 'Use eth_call (no gas) instead of a transaction',
      },
      value: {
        type: 'number',
        label: 'Value (HBAR)',
        defaultValue: 0,
        helpText: 'HBAR to send (for payable)',
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'contractAddress', label: 'Contract Address', type: 'address' },
      { id: 'params', label: 'Parameters', type: 'json' },
    ],
    outputs: [
      { id: 'result', label: 'Result', type: 'json' },
      { id: 'transactionId', label: 'Transaction ID', type: 'transaction' },
    ],
    requiredPlugins: ['coreEVMPlugin'],
    requiredTools: ['CALL_CONTRACT_TOOL'],
    codeTemplate: 'call-contract.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },

  'query-contract': {
    id: 'query-contract',
    name: 'Query Contract',
    category: 'hedera-evm',
    description: 'Read smart contract state from Hedera mirror node',
    icon: 'Database',
    color: '#f97316',
    type: 'hedera',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      contractAddress: {
        type: 'address',
        label: 'Contract Address',
        placeholder: '0x...',
        required: true,
        helpText: 'Address of the deployed smart contract',
      },
      abi: {
        type: 'json',
        label: 'Contract ABI',
        placeholder: '[{"type": "function", "name": "..."}]',
        required: true,
        helpText: 'Contract ABI for decoding the response',
      },
      functionName: {
        type: 'text',
        label: 'Function Name',
        placeholder: 'totalSupply',
        required: true,
        helpText: 'View/pure function to call via mirror node',
      },
      args: {
        type: 'json',
        label: 'Function Arguments',
        placeholder: '[]',
        defaultValue: [],
        helpText: 'JSON array of arguments to pass to the function',
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'contractAddress', label: 'Contract Address', type: 'address' },
    ],
    outputs: [
      { id: 'data', label: 'Data', type: 'json' },
    ],
    requiredPlugins: ['coreEVMQueryPlugin'],
    requiredTools: ['QUERY_CONTRACT_TOOL'],
    codeTemplate: 'query-contract.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk'],
  },
};
