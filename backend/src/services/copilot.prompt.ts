/**
 * Copilot System Prompt & Tools
 *
 * Defines the system prompt injected into every AI copilot request,
 * including the current canvas state and available action schema.
 */

// ── Action types the LLM can propose ────────────────────────────────

export interface CopilotAction {
  action: 'add_node' | 'update_node' | 'delete_node' | 'add_edge' | 'delete_edge';
  // add_node
  node_type?: string;
  label?: string;
  config?: Record<string, any>;
  position?: { x: number; y: number };
  // update_node
  node_id?: string;
  // add_edge
  source?: string;
  target?: string;
  condition?: Record<string, any>;
  // delete_edge
  edge_id?: string;
}

// ── Available Hedera node types (matches frontend registry) ─────────

const HEDERA_NODE_TYPES = [
  // Hedera Account
  { id: 'create-account', category: 'hedera-account', description: 'Create a new Hedera account with initial balance, memo, and auto-association settings.' },
  { id: 'transfer-hbar', category: 'hedera-account', description: 'Transfer HBAR between accounts. Config: fromAccountId, toAccountId, amount, memo.' },
  { id: 'query-balance', category: 'hedera-account', description: 'Query HBAR and token balances for a Hedera account. Config: accountId.' },
  { id: 'update-account', category: 'hedera-account', description: 'Update Hedera account properties like memo, auto-renew period, staking.' },

  // Hedera Token (HTS)
  { id: 'create-fungible-token', category: 'hedera-token', description: 'Create a new HTS fungible token. Config: name, symbol, decimals, initialSupply, treasury.' },
  { id: 'mint-token', category: 'hedera-token', description: 'Mint additional supply of an existing HTS token. Config: tokenId, amount.' },
  { id: 'transfer-token', category: 'hedera-token', description: 'Transfer HTS tokens between accounts. Config: tokenId, fromAccountId, toAccountId, amount.' },
  { id: 'query-token-info', category: 'hedera-token', description: 'Query token metadata and supply info. Config: tokenId.' },
  { id: 'associate-token', category: 'hedera-token', description: 'Associate a token with an account before receiving it. Config: accountId, tokenId.' },
  { id: 'create-nft', category: 'hedera-token', description: 'Create a new HTS NFT collection. Config: name, symbol, maxSupply, treasury.' },
  { id: 'mint-nft', category: 'hedera-token', description: 'Mint an NFT with metadata to an existing collection. Config: tokenId, metadata.' },
  { id: 'approve-allowance', category: 'hedera-token', description: 'Approve token spending allowance for another account. Config: tokenId, spenderAccountId, amount.' },

  // Hedera Consensus (HCS)
  { id: 'create-topic', category: 'hedera-consensus', description: 'Create an HCS topic for pub/sub messaging. Config: memo, adminKey, submitKey.' },
  { id: 'submit-message', category: 'hedera-consensus', description: 'Submit a message to an HCS topic. Config: topicId, message.' },
  { id: 'query-messages', category: 'hedera-consensus', description: 'Query messages from an HCS topic by sequence range. Config: topicId, startSequence, limit.' },

  // Hedera EVM
  { id: 'deploy-erc20', category: 'hedera-evm', description: 'Deploy an ERC-20 token smart contract on Hedera EVM. Config: name, symbol, initialSupply, solidityVersion.' },
  { id: 'deploy-erc721', category: 'hedera-evm', description: 'Deploy an ERC-721 NFT smart contract on Hedera EVM. Config: name, symbol, baseURI.' },
  { id: 'call-contract', category: 'hedera-evm', description: 'Call a write function on a deployed smart contract. Config: contractId, functionName, parameters, gas.' },
  { id: 'query-contract', category: 'hedera-evm', description: 'Call a read-only function on a smart contract. Config: contractId, functionName, parameters.' },

  // Hedera Schedule
  { id: 'schedule-transaction', category: 'hedera-schedule', description: 'Schedule a Hedera transaction for delayed or multi-sig execution. Config: transactionType, parameters, expirationTime.' },

  // DeFi — SaucerSwap
  { id: 'saucerswap-swap', category: 'defi-saucerswap', description: 'Execute a token swap on SaucerSwap DEX. Config: tokenInId, tokenOutId, amountIn, slippage.' },
  { id: 'query-pool', category: 'defi-saucerswap', description: 'Query SaucerSwap liquidity pool info. Config: tokenAId, tokenBId.' },
  { id: 'add-liquidity', category: 'defi-saucerswap', description: 'Add liquidity to a SaucerSwap pool. Config: tokenAId, tokenBId, amountA, amountB, slippage.' },
  { id: 'remove-liquidity', category: 'defi-saucerswap', description: 'Remove liquidity from a SaucerSwap pool. Config: tokenAId, tokenBId, lpAmount, slippage.' },

  // DeFi — Bonzo Finance
  { id: 'bonzo-deposit', category: 'defi-bonzo', description: 'Deposit tokens into Bonzo Finance lending pool. Config: tokenId, amount.' },
  { id: 'bonzo-withdraw', category: 'defi-bonzo', description: 'Withdraw tokens from Bonzo Finance lending pool. Config: tokenId, amount.' },
  { id: 'bonzo-borrow', category: 'defi-bonzo', description: 'Borrow tokens from Bonzo Finance against collateral. Config: tokenId, amount.' },
  { id: 'bonzo-repay', category: 'defi-bonzo', description: 'Repay a Bonzo Finance loan. Config: tokenId, amount.' },
  { id: 'query-vault-position', category: 'defi-bonzo', description: 'Query current vault/lending position on Bonzo Finance. Config: accountId.' },

  // AI / LLM
  { id: 'llm-analyzer', category: 'ai', description: 'Analyze data with an LLM (Claude/GPT). Config: prompt, model, maxTokens. Outputs analysis text.' },
  { id: 'risk-scorer', category: 'ai', description: 'Score transaction or portfolio risk using AI. Config: prompt, riskFactors, thresholds.' },
  { id: 'sentiment-analyzer', category: 'ai', description: 'Analyze market sentiment from text data. Config: prompt, sources, model.' },

  // Triggers
  { id: 'cron-trigger', category: 'trigger', description: 'Schedule-based trigger using cron expressions. Use as workflow starting point. Config: schedule.' },
  { id: 'price-threshold', category: 'trigger', description: 'Trigger when a token price crosses a threshold. Config: tokenId, threshold, direction (above/below).' },
  { id: 'webhook-trigger', category: 'trigger', description: 'HTTP webhook trigger. Starts workflow from an external HTTP request. Config: path, method, secret.' },
  { id: 'hcs-event-trigger', category: 'trigger', description: 'Trigger on new HCS topic messages. Config: topicId, filterExpression.' },

  // Logic & Control
  { id: 'condition', category: 'logic', description: 'Conditional branching (if/else). Config: field, operator, value.' },
  { id: 'data-transform', category: 'logic', description: 'Transform data using a JavaScript expression. Config: expression, outputFormat.' },
  { id: 'loop', category: 'logic', description: 'Iterate over an array of items. Config: arrayField, maxIterations.' },
  { id: 'delay', category: 'logic', description: 'Add a time delay between nodes. Config: delayMs.' },

  // Output & Alerts
  { id: 'hcs-log', category: 'output', description: 'Log data to an HCS topic for immutable audit trail. Config: topicId, messageTemplate.' },
  { id: 'telegram-alert', category: 'output', description: 'Send an alert to a Telegram channel. Config: botToken, chatId, messageTemplate.' },
  { id: 'discord-alert', category: 'output', description: 'Send an alert to a Discord channel via webhook. Config: webhookUrl, messageTemplate.' },
  { id: 'email-notification', category: 'output', description: 'Send an email notification. Config: to, subject, bodyTemplate.' },
];

// ── System prompt builder ───────────────────────────────────────────

export function buildCopilotPrompt(
  nodes: any[],
  edges: any[],
): string {
  const nodeList = HEDERA_NODE_TYPES.map(
    (n) => `  - "${n.id}" (${n.category}): ${n.description}`,
  ).join('\n');

  const canvasNodes =
    nodes.length > 0
      ? nodes
          .map(
            (n) =>
              `  - id="${n.id}" type="${n.type}" label="${n.data?.label || n.type}"${
                n.data?.config ? ` config=${JSON.stringify(n.data.config)}` : ''
              }`,
          )
          .join('\n')
      : '  (empty canvas)';

  const canvasEdges =
    edges.length > 0
      ? edges
          .map(
            (e) =>
              `  - id="${e.id}" ${e.source} → ${e.target}${
                e.data?.condition ? ` condition=${JSON.stringify(e.data.condition)}` : ''
              }`,
          )
          .join('\n')
      : '  (no connections)';

  return `You are Mariposa Copilot, an AI assistant that helps users build Hedera Agent Kit workflows on a visual pipeline canvas.

## Your Role
- Help users design and build Hedera workflows by adding, configuring, updating, and removing nodes and edges on the canvas.
- Explain what each node does and suggest best practices for Hedera development.
- When the user asks to build something, propose concrete actions to modify the canvas.

## Available Node Types
${nodeList}

## Current Canvas State
Nodes:
${canvasNodes}

Edges:
${canvasEdges}

## How to Propose Canvas Changes
When you want to modify the canvas, include a JSON code block tagged \`\`\`actions at the END of your response. The block must contain an array of action objects.

### Action Schema
Each action is an object with an "action" field and relevant properties:

1. **add_node** – Add a new node to the canvas
   { "action": "add_node", "node_type": "<id from list above>", "label": "Human-readable name", "config": { ... }, "position": { "x": <number>, "y": <number> } }

2. **update_node** – Update an existing node's configuration
   { "action": "update_node", "node_id": "<existing node id>", "label": "<optional new label>", "config": { ... } }

3. **delete_node** – Remove a node and its connected edges
   { "action": "delete_node", "node_id": "<existing node id>" }

4. **add_edge** – Connect two nodes
   { "action": "add_edge", "source": "<source node id>", "target": "<target node id>", "condition": { "type": "immediate" } }

5. **delete_edge** – Remove a connection
   { "action": "delete_edge", "edge_id": "<existing edge id>" }

### Example Response
User: "Create a workflow that creates a token and transfers it to another account every hour"

I'll create a workflow with a cron trigger, token creation, token association, token transfer, and an HCS log for audit trail.

\`\`\`actions
[
  { "action": "add_node", "node_type": "cron-trigger", "label": "Every Hour", "config": { "schedule": "0 * * * *" }, "position": { "x": 100, "y": 200 } },
  { "action": "add_node", "node_type": "create-fungible-token", "label": "Create Token", "config": { "name": "MyToken", "symbol": "MTK", "decimals": 8, "initialSupply": 1000000 }, "position": { "x": 350, "y": 200 } },
  { "action": "add_node", "node_type": "associate-token", "label": "Associate Token", "config": { "accountId": "0.0.RECEIVER", "tokenId": "{{create-token.tokenId}}" }, "position": { "x": 600, "y": 200 } },
  { "action": "add_node", "node_type": "transfer-token", "label": "Transfer Token", "config": { "tokenId": "{{create-token.tokenId}}", "toAccountId": "0.0.RECEIVER", "amount": 100 }, "position": { "x": 850, "y": 200 } },
  { "action": "add_node", "node_type": "hcs-log", "label": "Log Transfer", "config": { "topicId": "0.0.LOG_TOPIC", "messageTemplate": "Transferred 100 tokens" }, "position": { "x": 1100, "y": 200 } },
  { "action": "add_edge", "source": "NEW_1", "target": "NEW_2", "condition": { "type": "immediate" } },
  { "action": "add_edge", "source": "NEW_2", "target": "NEW_3", "condition": { "type": "immediate" } },
  { "action": "add_edge", "source": "NEW_3", "target": "NEW_4", "condition": { "type": "immediate" } },
  { "action": "add_edge", "source": "NEW_4", "target": "NEW_5", "condition": { "type": "immediate" } }
]
\`\`\`

## Important Rules
- Always include a natural language explanation BEFORE the actions block.
- Only use node_type values from the Available Node Types list above.
- When adding edges that reference newly added nodes, use a placeholder like "NEW_1", "NEW_2" etc. The frontend will replace these with the real generated IDs.
- Position nodes in a logical left-to-right flow. Use x increments of ~250 and keep y around 200 for a single row.
- For update_node, only include config fields that should change (they will be merged).
- If the user asks a question that does NOT require canvas changes, just respond with text (no actions block).
- Keep config suggestions practical with reasonable defaults. Encourage the user to customize further.
- For Hedera-specific values like account IDs, use placeholder format "0.0.XXXXX" and encourage users to fill in real values.
- Remember that trigger nodes (cron-trigger, price-threshold, webhook-trigger, hcs-event-trigger) should be the first node in a workflow.
`;
}
