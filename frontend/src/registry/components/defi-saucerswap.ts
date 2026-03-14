/**
 * DeFi SaucerSwap Components
 * Components for interacting with SaucerSwap DEX on Hedera
 */

import { ComponentSchema } from '@/types';

export const DEFI_SAUCERSWAP_COMPONENTS: Record<string, ComponentSchema> = {
  'saucerswap-swap': {
    id: 'saucerswap-swap',
    name: 'SaucerSwap Swap',
    category: 'defi-saucerswap',
    description: 'Swap tokens on SaucerSwap DEX via router contract',
    icon: 'Repeat',
    color: '#22c55e',
    type: 'defi',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      tokenIn: {
        type: 'select',
        label: 'Token In',
        required: true,
        options: [
          { value: 'HBAR', label: 'HBAR' },
          { value: '0.0.456858', label: 'USDC (0.0.456858)' },
          { value: '0.0.731861', label: 'SAUCE (0.0.731861)' },
          { value: 'custom', label: 'Custom' },
        ],
      },
      customTokenIn: {
        type: 'token-id',
        label: 'Custom Token In',
        showWhen: { field: 'tokenIn', value: 'custom' },
      },
      tokenOut: {
        type: 'select',
        label: 'Token Out',
        required: true,
        options: [
          { value: 'HBAR', label: 'HBAR' },
          { value: '0.0.456858', label: 'USDC (0.0.456858)' },
          { value: '0.0.731861', label: 'SAUCE (0.0.731861)' },
          { value: 'custom', label: 'Custom' },
        ],
      },
      customTokenOut: {
        type: 'token-id',
        label: 'Custom Token Out',
        showWhen: { field: 'tokenOut', value: 'custom' },
      },
      amountIn: {
        type: 'number',
        label: 'Amount In',
        required: true,
      },
      slippageBps: {
        type: 'number',
        label: 'Slippage (bps)',
        defaultValue: 100,
        required: true,
        helpText: '100 = 1% slippage tolerance',
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'amount', label: 'Amount', type: 'number' },
    ],
    outputs: [
      { id: 'amountOut', label: 'Amount Out', type: 'number' },
      { id: 'transactionId', label: 'Transaction ID', type: 'transaction' },
    ],
    requiredPlugins: ['coreEVMPlugin'],
    requiredTools: ['CALL_CONTRACT_TOOL'],
    codeTemplate: 'saucerswap-swap.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk', 'viem'],
  },

  'query-pool': {
    id: 'query-pool',
    name: 'Query Pool',
    category: 'defi-saucerswap',
    description: 'Get price, TVL, volume for any SaucerSwap pool via API',
    icon: 'BarChart3',
    color: '#22c55e',
    type: 'defi',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      poolAddress: {
        type: 'address',
        label: 'Pool Address',
        placeholder: '0x...',
        required: true,
      },
      tokenPair: {
        type: 'text',
        label: 'Token Pair',
        placeholder: 'HBAR/USDC',
      },
    },
    outputs: [
      { id: 'price', label: 'Price', type: 'number' },
      { id: 'tvl', label: 'TVL', type: 'number' },
      { id: 'volume24h', label: 'Volume (24h)', type: 'number' },
      { id: 'poolData', label: 'Pool Data', type: 'json' },
    ],
    codeTemplate: 'query-pool.hbs',
    requiredPackages: ['axios'],
  },

  'add-liquidity': {
    id: 'add-liquidity',
    name: 'Add Liquidity',
    category: 'defi-saucerswap',
    description: 'Add liquidity to a SaucerSwap V2 concentrated pool',
    icon: 'PlusCircle',
    color: '#22c55e',
    type: 'defi',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      tokenA: {
        type: 'token-id',
        label: 'Token A',
        required: true,
      },
      tokenB: {
        type: 'token-id',
        label: 'Token B',
        required: true,
      },
      amountA: {
        type: 'number',
        label: 'Amount A',
        required: true,
      },
      amountB: {
        type: 'number',
        label: 'Amount B',
        required: true,
      },
      tickLower: {
        type: 'number',
        label: 'Tick Lower',
        required: true,
        helpText: 'Lower price tick',
      },
      tickUpper: {
        type: 'number',
        label: 'Tick Upper',
        required: true,
        helpText: 'Upper price tick',
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
    ],
    outputs: [
      { id: 'positionId', label: 'Position ID', type: 'string' },
      { id: 'transactionId', label: 'Transaction ID', type: 'transaction' },
    ],
    requiredPlugins: ['coreEVMPlugin'],
    codeTemplate: 'add-liquidity.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk', 'viem'],
  },

  'remove-liquidity': {
    id: 'remove-liquidity',
    name: 'Remove Liquidity',
    category: 'defi-saucerswap',
    description: 'Remove liquidity from a SaucerSwap pool position',
    icon: 'MinusCircle',
    color: '#22c55e',
    type: 'defi',
    handles: {
      hasTopHandle: true,
      hasBottomHandle: true,
    },
    configSchema: {
      positionId: {
        type: 'text',
        label: 'Position ID',
        required: true,
      },
      percentage: {
        type: 'number',
        label: 'Percentage',
        defaultValue: 100,
        required: true,
        helpText: 'Percentage of position to remove (1-100)',
      },
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
    ],
    outputs: [
      { id: 'amountA', label: 'Amount A', type: 'number' },
      { id: 'amountB', label: 'Amount B', type: 'number' },
      { id: 'transactionId', label: 'Transaction ID', type: 'transaction' },
    ],
    requiredPlugins: ['coreEVMPlugin'],
    codeTemplate: 'remove-liquidity.hbs',
    requiredPackages: ['hedera-agent-kit', '@hashgraph/sdk', 'viem'],
  },
};
