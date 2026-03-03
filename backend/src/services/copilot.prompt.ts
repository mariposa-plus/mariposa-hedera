/**
 * Copilot System Prompt & Tools
 *
 * Defines the system prompt injected into every Together AI request,
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

// ── Available CRE node types (matches frontend registry) ───────────

const CRE_NODE_TYPES = [
  // Triggers
  { id: 'cron-trigger', category: 'cre-triggers', description: 'Schedule-based trigger (cron expression). Use as the starting point for time-based workflows.' },
  { id: 'http-trigger', category: 'cre-triggers', description: 'HTTP webhook trigger. Use when the workflow should start from an external HTTP request.' },
  { id: 'evm-log-trigger', category: 'cre-triggers', description: 'Listens for EVM log events on-chain. Use when workflow should react to smart contract events.' },

  // Capabilities
  { id: 'http-fetch', category: 'cre-capabilities', description: 'Fetch data from an HTTP/REST API endpoint. Config: url, method, headers, body.' },
  { id: 'evm-read', category: 'cre-capabilities', description: 'Read data from an EVM smart contract (call a view/pure function). Config: contractAddress, method, abi, args, chainId.' },
  { id: 'evm-write', category: 'cre-capabilities', description: 'Write/send a transaction to an EVM smart contract. Config: contractAddress, method, abi, args, chainId, value.' },
  { id: 'node-mode', category: 'cre-capabilities', description: 'Execute custom JavaScript/TypeScript compute logic. Config: code (string of JS/TS).' },
  { id: 'secrets-access', category: 'cre-capabilities', description: 'Access encrypted secrets stored in Chainlink DON. Config: secretKey.' },

  // Logic
  { id: 'consensus-aggregation', category: 'cre-logic', description: 'Aggregate results from multiple DON nodes using a consensus method. Config: method (median, mode, etc.).' },
  { id: 'data-transform', category: 'cre-logic', description: 'Transform data between nodes using a JavaScript expression. Config: expression.' },
  { id: 'condition', category: 'cre-logic', description: 'Conditional branching (if/else). Config: field, operator, value.' },
  { id: 'abi-encode', category: 'cre-logic', description: 'ABI-encode data for EVM contract calls. Config: types, values.' },
  { id: 'abi-decode', category: 'cre-logic', description: 'ABI-decode data from EVM contract responses. Config: types, data.' },

  // Solidity Contracts
  { id: 'ireceiver-contract', category: 'solidity-contracts', description: 'Standard IReceiver consumer contract that receives CRE workflow output on-chain.' },
  { id: 'price-feed-consumer', category: 'solidity-contracts', description: 'Consumer contract for price feed data.' },
  { id: 'custom-data-consumer', category: 'solidity-contracts', description: 'Consumer contract for custom data delivery.' },
  { id: 'event-emitter', category: 'solidity-contracts', description: 'Contract that emits events when data is received.' },

  // Chain Config
  { id: 'chain-selector', category: 'chain-config', description: 'Select which blockchain network to target.' },
  { id: 'contract-address', category: 'chain-config', description: 'Specify a deployed contract address.' },
  { id: 'wallet-signer', category: 'chain-config', description: 'Specify wallet/signer for transactions.' },
  { id: 'rpc-endpoint', category: 'chain-config', description: 'Configure custom RPC endpoint.' },
];

// ── System prompt builder ───────────────────────────────────────────

export function buildCopilotPrompt(
  nodes: any[],
  edges: any[],
): string {
  const nodeList = CRE_NODE_TYPES.map(
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

  return `You are Mariposa Copilot, an AI assistant that helps users build Chainlink CRE (Compute Runtime Environment) workflows on a visual pipeline canvas.

## Your Role
- Help users design and build CRE workflows by adding, configuring, updating, and removing nodes and edges on the canvas.
- Explain what each node does and suggest best practices.
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
User: "Create a workflow that fetches ETH price every 5 minutes and writes it on-chain"

I'll create a workflow with a cron trigger, HTTP fetch for price data, a data transform to extract the price, ABI encoding, and an EVM write to push it on-chain.

\`\`\`actions
[
  { "action": "add_node", "node_type": "cron-trigger", "label": "Every 5 Min", "config": { "schedule": "*/5 * * * *" }, "position": { "x": 100, "y": 200 } },
  { "action": "add_node", "node_type": "http-fetch", "label": "Fetch ETH Price", "config": { "url": "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", "method": "GET" }, "position": { "x": 350, "y": 200 } },
  { "action": "add_node", "node_type": "data-transform", "label": "Extract Price", "config": { "expression": "input.ethereum.usd" }, "position": { "x": 600, "y": 200 } },
  { "action": "add_node", "node_type": "abi-encode", "label": "Encode Price", "config": { "types": ["uint256"], "values": ["price"] }, "position": { "x": 850, "y": 200 } },
  { "action": "add_node", "node_type": "evm-write", "label": "Write On-Chain", "config": { "contractAddress": "0x...", "method": "updatePrice", "args": ["encodedData"] }, "position": { "x": 1100, "y": 200 } },
  { "action": "add_edge", "source": "cron-trigger-<ts>", "target": "http-fetch-<ts>", "condition": { "type": "immediate" } },
  { "action": "add_edge", "source": "http-fetch-<ts>", "target": "data-transform-<ts>", "condition": { "type": "immediate" } },
  { "action": "add_edge", "source": "data-transform-<ts>", "target": "abi-encode-<ts>", "condition": { "type": "immediate" } },
  { "action": "add_edge", "source": "abi-encode-<ts>", "target": "evm-write-<ts>", "condition": { "type": "immediate" } }
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
`;
}
