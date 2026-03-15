import Pipeline from '../models/Pipeline';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

interface PipelineNode {
  id: string;
  type: string;
  data: {
    type: string;
    label: string;
    config?: Record<string, any>;
    fullConfig?: {
      component: Record<string, any>;
      input?: { mappings: any[] };
      output?: { routes: any[] };
    };
  };
}

interface PipelineEdge {
  id: string;
  source: string;
  target: string;
}

interface GeneratedWorkflow {
  fullCode: string;
  imports: string;
  configSchema: string;
  workflowBody: string;
  warnings: string[];
}

// Plugin mapping: node type -> required plugins
const NODE_PLUGIN_MAP: Record<string, string[]> = {
  'create-account': ['coreAccountPlugin'],
  'transfer-hbar': ['coreAccountPlugin'],
  'query-balance': ['coreAccountQueryPlugin'],
  'update-account': ['coreAccountPlugin'],
  'create-fungible-token': ['coreTokenPlugin'],
  'mint-token': ['coreTokenPlugin'],
  'transfer-token': ['coreTokenPlugin'],
  'query-token-info': ['coreTokenQueryPlugin'],
  'associate-token': ['coreTokenPlugin'],
  'create-nft': ['coreTokenPlugin'],
  'mint-nft': ['coreTokenPlugin'],
  'approve-allowance': ['coreTokenPlugin'],
  'create-topic': ['coreConsensusPlugin'],
  'submit-message': ['coreConsensusPlugin'],
  'query-messages': ['coreConsensusQueryPlugin'],
  'deploy-erc20': ['coreEVMPlugin'],
  'deploy-erc721': ['coreEVMPlugin'],
  'call-contract': ['coreEVMPlugin'],
  'query-contract': ['coreEVMQueryPlugin'],
  'saucerswap-swap': ['coreEVMPlugin'],
  'add-liquidity': ['coreEVMPlugin'],
  'remove-liquidity': ['coreEVMPlugin'],
};

// Package mapping: node type -> required npm packages
const NODE_PACKAGE_MAP: Record<string, string[]> = {
  'llm-analyzer': ['axios'],
  'risk-scorer': ['axios'],
  'sentiment-analyzer': ['axios'],
  'query-pool': ['axios'],
  'telegram-alert': ['axios'],
  'discord-alert': ['axios'],
  'email-notification': ['nodemailer'],
  'cron-trigger': ['node-cron'],
  'webhook-trigger': ['express'],
};

class HederaCodeGeneratorService {
  private templateCache: Map<string, Handlebars.TemplateDelegate> = new Map();
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'templates');
    this.registerHelpers();
  }

  private registerHelpers() {
    Handlebars.registerHelper('json', (context: any) => JSON.stringify(context, null, 2));
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    Handlebars.registerHelper('or', (...args: any[]) => {
      const options = args.pop();
      return args.some(Boolean) ? options.fn(options.data.root) : options.inverse(options.data.root);
    });
  }

  async generateFromPipeline(pipelineId: string): Promise<GeneratedWorkflow> {
    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) throw new Error('Pipeline not found');
    return this.generate(pipeline.nodes as any[], pipeline.edges as any[]);
  }

  generate(nodes: PipelineNode[], edges: PipelineEdge[]): GeneratedWorkflow {
    const warnings: string[] = [];

    // Find trigger nodes
    const targetNodeIds = new Set(edges.map(e => e.target));
    const triggerNodes = nodes.filter(n => !targetNodeIds.has(n.id) && this.isTriggerNode(n));
    const nonTriggerNodes = nodes.filter(n => !this.isTriggerNode(n));

    if (triggerNodes.length === 0) {
      warnings.push('No trigger node found. Workflow will run as a one-shot execution.');
    }
    if (triggerNodes.length > 1) {
      warnings.push('Multiple triggers found. Only the first will be used.');
    }

    const triggerNode = triggerNodes[0] || null;

    // Topological sort
    const sorted = this.topologicalSort(nonTriggerNodes, edges);

    // Collect required plugins and packages
    const requiredPlugins = this.collectPlugins(nodes);
    const requiredPackages = this.collectPackages(nodes);

    // Generate code sections
    const imports = this.generateImports(nodes, requiredPlugins, requiredPackages);
    const configSection = this.generateConfigSection();
    const agentSetup = this.generateAgentSetup(requiredPlugins);
    const triggerCode = this.generateTriggerCode(triggerNode);
    const workflowBody = this.generateWorkflowBody(sorted, edges);

    const fullCode = `${imports}

${configSection}

${agentSetup}

async function runWorkflow() {
${triggerCode}
${workflowBody}
  console.log('Workflow completed successfully');
}

runWorkflow().catch(console.error);
`;

    return {
      fullCode,
      imports,
      configSchema: configSection,
      workflowBody,
      warnings,
    };
  }

  private isTriggerNode(node: PipelineNode): boolean {
    return ['cron-trigger', 'price-threshold', 'webhook-trigger', 'hcs-event-trigger'].includes(node.type);
  }

  private topologicalSort(nodes: PipelineNode[], edges: PipelineEdge[]): PipelineNode[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjacency.set(node.id, []);
    }

    for (const edge of edges) {
      if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
        adjacency.get(edge.source)!.push(edge.target);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) queue.push(nodeId);
    }

    const sorted: PipelineNode[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodeMap.get(nodeId);
      if (node) sorted.push(node);

      for (const neighbor of adjacency.get(nodeId) || []) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    return sorted;
  }

  private collectPlugins(nodes: PipelineNode[]): string[] {
    const plugins = new Set<string>();
    for (const node of nodes) {
      const nodePlugins = NODE_PLUGIN_MAP[node.type] || [];
      nodePlugins.forEach(p => plugins.add(p));
    }
    return Array.from(plugins);
  }

  private collectPackages(nodes: PipelineNode[]): string[] {
    const packages = new Set<string>(['hedera-agent-kit', '@hashgraph/sdk']);
    for (const node of nodes) {
      const nodePackages = NODE_PACKAGE_MAP[node.type] || [];
      nodePackages.forEach(p => packages.add(p));
    }
    // Add viem if EVM nodes present
    if (nodes.some(n => ['deploy-erc20', 'deploy-erc721', 'call-contract', 'query-contract', 'saucerswap-swap', 'bonzo-deposit', 'bonzo-withdraw', 'bonzo-borrow', 'bonzo-repay'].includes(n.type))) {
      packages.add('viem');
    }
    return Array.from(packages);
  }

  private generateImports(nodes: PipelineNode[], plugins: string[], packages: string[]): string {
    const lines: string[] = [];

    lines.push("import dotenv from 'dotenv';");
    lines.push("dotenv.config();");
    lines.push('');
    lines.push("import { HederaAgentKit } from 'hedera-agent-kit';");

    if (plugins.length > 0) {
      lines.push(`// Plugins: ${plugins.join(', ')}`);
    }

    if (packages.includes('viem')) {
      lines.push("import { createPublicClient, http } from 'viem';");
    }
    // Bedrock LLM helper (generated when AI nodes are present)
    if (nodes.some(n => ['llm-analyzer', 'risk-scorer', 'sentiment-analyzer'].includes(n.type))) {
      lines.push('');
      lines.push('// AWS Bedrock LLM helper');
      lines.push('const bedrockRegion = process.env.AWS_BEDROCK_REGION || "us-east-1";');
      lines.push('const bedrockToken = process.env.AWS_BEARER_TOKEN_BEDROCK!;');
      lines.push('const bedrockHeaders = {');
      lines.push('  "Content-Type": "application/json",');
      lines.push('  Accept: "application/json",');
      lines.push('  Authorization: `Bearer ${bedrockToken}`,');
      lines.push('};');
      lines.push('async function callBedrock(modelId: string, systemPrompt: string, userPrompt: string, maxTokens = 1024) {');
      lines.push('  const url = `https://bedrock-runtime.${bedrockRegion}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`;');
      lines.push('  const resp = await axios.post(url, {');
      lines.push('    messages: [{ role: "user", content: [{ text: userPrompt }] }],');
      lines.push('    system: [{ text: systemPrompt }],');
      lines.push('    inferenceConfig: { maxTokens, temperature: 0.3 },');
      lines.push('  }, { headers: bedrockHeaders });');
      lines.push('  return resp.data.output?.message?.content?.[0]?.text || "";');
      lines.push('}');
    }
    if (packages.includes('axios')) {
      lines.push("import axios from 'axios';");
    }
    if (packages.includes('node-cron')) {
      lines.push("import cron from 'node-cron';");
    }
    if (packages.includes('nodemailer')) {
      lines.push("import nodemailer from 'nodemailer';");
    }

    return lines.join('\n');
  }

  private generateConfigSection(): string {
    return `// Configuration
const config = {
  operatorId: process.env.HEDERA_OPERATOR_ID!,
  operatorKey: process.env.HEDERA_OPERATOR_KEY!,
  network: (process.env.HEDERA_NETWORK || 'testnet') as 'mainnet' | 'testnet',
};`;
  }

  private generateAgentSetup(plugins: string[]): string {
    const lines: string[] = [];
    lines.push('// Initialize Hedera Agent Kit');
    lines.push('const agentKit = new HederaAgentKit(');
    lines.push('  config.operatorId,');
    lines.push('  config.operatorKey,');
    lines.push('  config.network,');
    lines.push(');');

    if (plugins.length > 0) {
      lines.push('');
      lines.push('// Register plugins');
      for (const plugin of plugins) {
        lines.push(`// agentKit.registerPlugin(${plugin});`);
      }
    }

    return lines.join('\n');
  }

  private generateTriggerCode(triggerNode: PipelineNode | null): string {
    if (!triggerNode) {
      return '  // One-shot execution (no trigger node)';
    }

    const config = triggerNode.data?.fullConfig?.component || triggerNode.data?.config || {};
    const varName = this.sanitizeVarName(triggerNode.id);

    switch (triggerNode.type) {
      case 'cron-trigger':
        return `  // Cron Trigger: ${triggerNode.data.label || 'Schedule'}
  // Schedule: ${config.schedule || '*/5 * * * *'}
  // In production, wrap workflow body in: cron.schedule('${config.schedule || '*/5 * * * *'}', async () => { ... });`;

      case 'webhook-trigger':
        return `  // Webhook Trigger: ${triggerNode.data.label || 'Webhook'}
  // Path: ${config.path || '/webhook'}
  // In production, set up Express server listening on this path`;

      case 'price-threshold':
        return `  // Price Threshold Trigger: ${triggerNode.data.label || 'Price Watch'}
  // Token: ${config.tokenId || 'N/A'}, Target: ${config.targetPrice || 'N/A'}, Direction: ${config.direction || 'above'}`;

      case 'hcs-event-trigger':
        return `  // HCS Event Trigger: ${triggerNode.data.label || 'Topic Listener'}
  // Topic: ${config.topicId || 'N/A'}`;

      default:
        return '  // Unknown trigger type';
    }
  }

  private generateWorkflowBody(sortedNodes: PipelineNode[], edges: PipelineEdge[]): string {
    const lines: string[] = [];

    for (const node of sortedNodes) {
      const varName = this.sanitizeVarName(node.id);
      const config = node.data?.fullConfig?.component || node.data?.config || {};
      const label = node.data.label || node.type;

      // Try to load Handlebars template
      const templateCode = this.renderNodeTemplate(node.type, { varName, config, label, node });

      if (templateCode) {
        lines.push(templateCode);
      } else {
        // Fallback: generate inline code
        lines.push(this.generateInlineNodeCode(node, varName, config, label));
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  private renderNodeTemplate(nodeType: string, context: any): string | null {
    try {
      const templatePath = path.join(this.templatesDir, 'nodes', `${nodeType}.hbs`);
      if (!fs.existsSync(templatePath)) return null;

      if (!this.templateCache.has(nodeType)) {
        const templateSource = fs.readFileSync(templatePath, 'utf-8');
        this.templateCache.set(nodeType, Handlebars.compile(templateSource));
      }

      const template = this.templateCache.get(nodeType)!;
      return template(context);
    } catch {
      return null;
    }
  }

  private generateInlineNodeCode(node: PipelineNode, varName: string, config: any, label: string): string {
    const lines: string[] = [];

    switch (node.type) {
      // Hedera Account
      case 'create-account':
        lines.push(`  // Create Account: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.createAccount({`);
        if (config.initialBalance) lines.push(`    initialBalance: ${config.initialBalance},`);
        if (config.memo) lines.push(`    memo: "${config.memo}",`);
        if (config.maxAutoAssociations !== undefined) lines.push(`    maxAutoAssociations: ${config.maxAutoAssociations},`);
        lines.push(`  });`);
        lines.push(`  console.log('Created account:', ${varName}_result);`);
        break;

      case 'transfer-hbar':
        lines.push(`  // Transfer HBAR: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.transferHbar({`);
        lines.push(`    toAccountId: "${config.toAccountId || '0.0.XXXXX'}",`);
        lines.push(`    amount: ${config.amount || 1},`);
        if (config.memo) lines.push(`    memo: "${config.memo}",`);
        lines.push(`  });`);
        lines.push(`  console.log('Transfer result:', ${varName}_result);`);
        break;

      case 'query-balance':
        lines.push(`  // Query Balance: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.getHbarBalance("${config.accountId || ''}");`);
        lines.push(`  console.log('Balance:', ${varName}_result);`);
        break;

      case 'update-account':
        lines.push(`  // Update Account: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.updateAccount({`);
        lines.push(`    accountId: "${config.accountId || ''}",`);
        if (config.memo) lines.push(`    memo: "${config.memo}",`);
        if (config.maxAutoAssociations !== undefined) lines.push(`    maxAutoAssociations: ${config.maxAutoAssociations},`);
        lines.push(`  });`);
        break;

      // Hedera Token
      case 'create-fungible-token':
        lines.push(`  // Create Fungible Token: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.createFungibleToken({`);
        lines.push(`    name: "${config.name || 'Token'}",`);
        lines.push(`    symbol: "${config.symbol || 'TKN'}",`);
        lines.push(`    decimals: ${config.decimals || 2},`);
        lines.push(`    initialSupply: ${config.initialSupply || 1000000},`);
        lines.push(`  });`);
        lines.push(`  console.log('Created token:', ${varName}_result);`);
        break;

      case 'mint-token':
        lines.push(`  // Mint Token: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.mintToken("${config.tokenId || ''}", ${config.amount || 0});`);
        break;

      case 'transfer-token':
        lines.push(`  // Transfer Token: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.transferToken({`);
        lines.push(`    tokenId: "${config.tokenId || ''}",`);
        lines.push(`    toAccountId: "${config.toAccountId || ''}",`);
        lines.push(`    amount: ${config.amount || 0},`);
        lines.push(`  });`);
        break;

      case 'associate-token':
        lines.push(`  // Associate Token: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.associateToken("${config.accountId || ''}", "${config.tokenId || ''}");`);
        break;

      case 'query-token-info':
        lines.push(`  // Query Token Info: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.getTokenInfo("${config.tokenId || ''}");`);
        break;

      case 'create-nft':
        lines.push(`  // Create NFT Collection: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.createNFT({`);
        lines.push(`    name: "${config.name || 'NFT'}",`);
        lines.push(`    symbol: "${config.symbol || 'NFT'}",`);
        if (config.maxSupply) lines.push(`    maxSupply: ${config.maxSupply},`);
        lines.push(`  });`);
        break;

      case 'mint-nft':
        lines.push(`  // Mint NFT: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.mintNFT("${config.tokenId || ''}", "${config.metadata || ''}");`);
        break;

      case 'approve-allowance':
        lines.push(`  // Approve Allowance: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.approveAllowance({`);
        lines.push(`    tokenId: "${config.tokenId || ''}",`);
        lines.push(`    spenderAccountId: "${config.spenderAccountId || ''}",`);
        lines.push(`    amount: ${config.amount || 0},`);
        lines.push(`  });`);
        break;

      // Hedera Consensus
      case 'create-topic':
        lines.push(`  // Create Topic: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.createTopic({`);
        if (config.memo) lines.push(`    memo: "${config.memo}",`);
        lines.push(`    adminKey: ${config.adminKey !== false},`);
        lines.push(`  });`);
        lines.push(`  console.log('Created topic:', ${varName}_result);`);
        break;

      case 'submit-message':
        lines.push(`  // Submit Message: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.submitMessage({`);
        lines.push(`    topicId: "${config.topicId || ''}",`);
        lines.push(`    message: "${config.message || ''}",`);
        lines.push(`  });`);
        break;

      case 'query-messages':
        lines.push(`  // Query Messages: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.getTopicMessages("${config.topicId || ''}", {`);
        if (config.fromSequence) lines.push(`    fromSequence: ${config.fromSequence},`);
        if (config.limit) lines.push(`    limit: ${config.limit},`);
        lines.push(`  });`);
        break;

      // EVM
      case 'deploy-erc20':
        lines.push(`  // Deploy ERC-20: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.deployERC20({`);
        lines.push(`    name: "${config.name || ''}",`);
        lines.push(`    symbol: "${config.symbol || ''}",`);
        lines.push(`    initialSupply: ${config.initialSupply || 0},`);
        lines.push(`  });`);
        break;

      case 'deploy-erc721':
        lines.push(`  // Deploy ERC-721: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.deployERC721({`);
        lines.push(`    name: "${config.name || ''}",`);
        lines.push(`    symbol: "${config.symbol || ''}",`);
        if (config.baseURI) lines.push(`    baseURI: "${config.baseURI}",`);
        lines.push(`  });`);
        break;

      case 'call-contract':
        lines.push(`  // Call Contract: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.callContract({`);
        lines.push(`    contractAddress: "${config.contractAddress || ''}",`);
        lines.push(`    functionName: "${config.functionName || ''}",`);
        lines.push(`    args: ${JSON.stringify(config.args || [])},`);
        lines.push(`    isReadOnly: ${config.isReadOnly || false},`);
        lines.push(`  });`);
        break;

      case 'query-contract':
        lines.push(`  // Query Contract: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.queryContract({`);
        lines.push(`    contractAddress: "${config.contractAddress || ''}",`);
        lines.push(`    functionName: "${config.functionName || ''}",`);
        lines.push(`    args: ${JSON.stringify(config.args || [])},`);
        lines.push(`  });`);
        break;

      case 'schedule-transaction':
        lines.push(`  // Schedule Transaction: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.scheduleTransaction({`);
        lines.push(`    transactionType: "${config.transactionType || ''}",`);
        lines.push(`    expirationTime: "${config.expirationTime || ''}",`);
        lines.push(`    params: ${JSON.stringify(config.params || {})},`);
        lines.push(`  });`);
        break;

      // DeFi
      case 'saucerswap-swap':
        lines.push(`  // SaucerSwap Swap: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.saucerSwap({`);
        lines.push(`    tokenIn: "${config.tokenIn || 'HBAR'}",`);
        lines.push(`    tokenOut: "${config.tokenOut || 'USDC'}",`);
        lines.push(`    amountIn: ${config.amountIn || 0},`);
        lines.push(`    slippageBps: ${config.slippageBps || 100},`);
        lines.push(`  });`);
        break;

      case 'query-pool':
        lines.push(`  // Query Pool: ${label}`);
        lines.push(`  const ${varName}_result = await axios.get(\`https://api.saucerswap.finance/v2/pools/${config.poolAddress || ''}\`);`);
        break;

      case 'bonzo-deposit':
        lines.push(`  // Bonzo Deposit: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.bonzoDeposit({`);
        lines.push(`    vaultAddress: "${config.vaultAddress || ''}",`);
        lines.push(`    tokenId: "${config.tokenId || ''}",`);
        lines.push(`    amount: ${config.amount || 0},`);
        lines.push(`  });`);
        break;

      case 'bonzo-withdraw':
        lines.push(`  // Bonzo Withdraw: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.bonzoWithdraw({`);
        lines.push(`    vaultAddress: "${config.vaultAddress || ''}",`);
        lines.push(`    shares: ${config.shares || 0},`);
        lines.push(`  });`);
        break;

      case 'bonzo-borrow':
        lines.push(`  // Bonzo Borrow: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.bonzoBorrow({`);
        lines.push(`    tokenId: "${config.tokenId || ''}",`);
        lines.push(`    amount: ${config.amount || 0},`);
        lines.push(`  });`);
        break;

      case 'bonzo-repay':
        lines.push(`  // Bonzo Repay: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.bonzoRepay({`);
        lines.push(`    tokenId: "${config.tokenId || ''}",`);
        lines.push(`    amount: ${config.amount || 0},`);
        lines.push(`  });`);
        break;

      case 'query-vault-position':
        lines.push(`  // Query Vault Position: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.queryVaultPosition("${config.vaultAddress || ''}");`);
        break;

      // AI (AWS Bedrock via Converse API)
      case 'llm-analyzer':
        lines.push(`  // LLM Analyzer: ${label}`);
        lines.push(`  const ${varName}_result = await callBedrock(`);
        lines.push(`    "${config.model || 'openai.gpt-oss-120b-1:0'}",`);
        lines.push(`    "${(config.systemPrompt || 'You are a helpful AI assistant.').replace(/"/g, '\\"')}",`);
        lines.push(`    "${(config.userPrompt || 'Analyze the provided data.').replace(/"/g, '\\"')}",`);
        lines.push(`  );`);
        lines.push(`  console.log('LLM response:', ${varName}_result);`);
        break;

      case 'risk-scorer':
        lines.push(`  // Risk Scorer: ${label}`);
        lines.push(`  const ${varName}_raw = await callBedrock(`);
        lines.push(`    "${config.model || 'openai.gpt-oss-120b-1:0'}",`);
        lines.push(`    "You are a DeFi risk analyst. Evaluate the portfolio data and return a JSON object with: riskScore (0-100), analysis (string), recommendation (string). Respond with valid JSON only.",`);
        lines.push(`    JSON.stringify({ factors: ${JSON.stringify(config.factors || ['volatility', 'impermanent_loss', 'liquidity_depth', 'smart_contract_risk'])} }),`);
        lines.push(`  );`);
        lines.push(`  const ${varName}_result = JSON.parse(${varName}_raw);`);
        lines.push(`  console.log('Risk score:', ${varName}_result.riskScore);`);
        break;

      case 'sentiment-analyzer':
        lines.push(`  // Sentiment Analyzer: ${label}`);
        lines.push(`  const ${varName}_raw = await callBedrock(`);
        lines.push(`    "${config.model || 'openai.gpt-oss-120b-1:0'}",`);
        lines.push(`    "You are a market sentiment analyst. Analyze the data and return JSON with: sentimentScore (-100 to +100), summary (string), signals (array). Respond with valid JSON only.",`);
        lines.push(`    "Analyze this data",`);
        lines.push(`  );`);
        lines.push(`  const ${varName}_result = JSON.parse(${varName}_raw);`);
        lines.push(`  console.log('Sentiment:', ${varName}_result.sentimentScore);`);
        break;

      // Logic
      case 'condition':
        lines.push(`  // Condition: ${label}`);
        lines.push(`  const ${varName}_result = (() => {`);
        lines.push(`    // Evaluate: ${config.field || 'value'} ${config.operator || '=='} ${config.value || ''}`);
        lines.push(`    return true; // TODO: implement condition logic`);
        lines.push(`  })();`);
        break;

      case 'data-transform':
        lines.push(`  // Data Transform: ${label}`);
        lines.push(`  const ${varName}_result = (() => {`);
        lines.push(`    // Expression: ${config.expression || 'data'}`);
        lines.push(`    return null; // TODO: implement transform`);
        lines.push(`  })();`);
        break;

      case 'loop':
        lines.push(`  // Loop: ${label}`);
        lines.push(`  // Iterates over: ${config.arrayField || 'items'}`);
        lines.push(`  // Max iterations: ${config.maxIterations || 100}`);
        break;

      case 'delay':
        lines.push(`  // Delay: ${label}`);
        lines.push(`  await new Promise(resolve => setTimeout(resolve, ${(config.duration || 5) * (config.unit === 'minutes' ? 60000 : config.unit === 'hours' ? 3600000 : 1000)}));`);
        break;

      // Output
      case 'hcs-log':
        lines.push(`  // HCS Log: ${label}`);
        lines.push(`  const ${varName}_result = await agentKit.submitMessage({`);
        lines.push(`    topicId: "${config.topicId || ''}",`);
        lines.push(`    message: "${config.messageTemplate || ''}",`);
        lines.push(`  });`);
        break;

      case 'telegram-alert':
        lines.push(`  // Telegram Alert: ${label}`);
        lines.push(`  const ${varName}_result = await axios.post(\`https://api.telegram.org/bot${config.botToken || 'BOT_TOKEN'}/sendMessage\`, {`);
        lines.push(`    chat_id: "${config.chatId || ''}",`);
        lines.push(`    text: "${config.messageTemplate || ''}",`);
        lines.push(`    parse_mode: "${config.parseMode || 'HTML'}",`);
        lines.push(`  });`);
        break;

      case 'discord-alert':
        lines.push(`  // Discord Alert: ${label}`);
        lines.push(`  const ${varName}_result = await axios.post("${config.webhookUrl || ''}", {`);
        lines.push(`    username: "${config.username || 'Mariposa Bot'}",`);
        lines.push(`    content: "${config.messageTemplate || ''}",`);
        lines.push(`  });`);
        break;

      case 'email-notification':
        lines.push(`  // Email Notification: ${label}`);
        lines.push(`  // TODO: Configure SMTP transport and send email to ${config.to || ''}`);
        break;

      default:
        lines.push(`  // ${node.type}: ${label}`);
        lines.push(`  const ${varName}_result = { type: "${node.type}", status: "executed" };`);
        break;
    }

    return lines.join('\n');
  }

  private sanitizeVarName(nodeId: string): string {
    return nodeId
      .replace(/-(\w)/g, (_, c) => c.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '_');
  }
}

export const hederaCodeGenerator = new HederaCodeGeneratorService();
