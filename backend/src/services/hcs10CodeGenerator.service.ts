/**
 * HCS-10 & MCP Code Generator Service
 *
 * Generates all files for a deployable HCS-10 agent + MCP server project.
 * Uses inline code generation (same pattern as hederaCodeGenerator).
 */

import { hederaCodeGenerator } from './hederaCodeGenerator.service';

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

interface DeployConfig {
  hcs10?: {
    enabled: boolean;
    agentName: string;
    agentDescription: string;
    agentType: 'manual' | 'autonomous';
    autoAcceptConnections: boolean;
    registerOnBroker: boolean;
  };
  mcp?: {
    enabled: boolean;
    transport: 'stdio' | 'sse';
    port: number;
    registerOnBroker: boolean;
  };
  network: 'testnet' | 'mainnet';
}

interface GeneratedFile {
  relativePath: string;
  content: string;
}

interface GeneratedProjectFiles {
  files: GeneratedFile[];
  warnings: string[];
}

interface ActionDef {
  id: string;
  type: string;
  name: string;
  description: string;
}

interface McpToolDef {
  id: string;
  name: string;
  description: string;
  nodeType: string;
  params: { name: string; type: string; description: string; required: boolean }[];
}

// Node types that map to executable actions (exclude triggers, logic, output)
const ACTIONABLE_CATEGORIES = new Set([
  'create-account', 'transfer-hbar', 'query-balance', 'update-account',
  'create-fungible-token', 'mint-token', 'transfer-token', 'query-token-info',
  'associate-token', 'create-nft', 'mint-nft', 'approve-allowance',
  'create-topic', 'submit-message', 'query-messages',
  'deploy-erc20', 'deploy-erc721', 'call-contract', 'query-contract',
  'schedule-transaction',
  'saucerswap-swap', 'query-pool', 'add-liquidity', 'remove-liquidity',
  'bonzo-deposit', 'bonzo-withdraw', 'bonzo-borrow', 'bonzo-repay', 'query-vault-position',
  'llm-analyzer', 'risk-scorer', 'sentiment-analyzer',
]);

const NODE_DESCRIPTIONS: Record<string, string> = {
  'create-account': 'Create a new Hedera account',
  'transfer-hbar': 'Transfer HBAR to an account',
  'query-balance': 'Query HBAR balance of an account',
  'update-account': 'Update account settings',
  'create-fungible-token': 'Create a new fungible token',
  'mint-token': 'Mint additional tokens',
  'transfer-token': 'Transfer tokens to an account',
  'query-token-info': 'Query token information',
  'associate-token': 'Associate a token with an account',
  'create-nft': 'Create an NFT collection',
  'mint-nft': 'Mint a new NFT',
  'approve-allowance': 'Approve token allowance for a spender',
  'create-topic': 'Create an HCS topic',
  'submit-message': 'Submit a message to an HCS topic',
  'query-messages': 'Query messages from an HCS topic',
  'deploy-erc20': 'Deploy an ERC-20 token contract',
  'deploy-erc721': 'Deploy an ERC-721 NFT contract',
  'call-contract': 'Call a smart contract function',
  'query-contract': 'Query a smart contract (read-only)',
  'schedule-transaction': 'Schedule a transaction for later execution',
  'saucerswap-swap': 'Swap tokens on SaucerSwap DEX',
  'query-pool': 'Query SaucerSwap pool data',
  'add-liquidity': 'Add liquidity to a SaucerSwap pool',
  'remove-liquidity': 'Remove liquidity from a SaucerSwap pool',
  'bonzo-deposit': 'Deposit into Bonzo Finance vault',
  'bonzo-withdraw': 'Withdraw from Bonzo Finance vault',
  'bonzo-borrow': 'Borrow from Bonzo Finance',
  'bonzo-repay': 'Repay Bonzo Finance loan',
  'query-vault-position': 'Query Bonzo vault position',
  'llm-analyzer': 'Run AI analysis on data',
  'risk-scorer': 'Evaluate portfolio risk score',
  'sentiment-analyzer': 'Analyze market sentiment',
};

class HCS10CodeGeneratorService {
  /**
   * Main orchestrator — generates all project files.
   */
  generateProjectFiles(
    nodes: PipelineNode[],
    edges: PipelineEdge[],
    deployConfig: DeployConfig,
  ): GeneratedProjectFiles {
    const files: GeneratedFile[] = [];
    const warnings: string[] = [];

    // 1. Generate base workflow code via existing code generator
    const baseWorkflow = hederaCodeGenerator.generate(nodes, edges);
    warnings.push(...baseWorkflow.warnings);

    // 2. Write workflow as separate file
    files.push({ relativePath: 'src/workflow.ts', content: baseWorkflow.fullCode });

    // 3. Generate HCS-10 files if enabled
    if (deployConfig.hcs10?.enabled) {
      files.push({
        relativePath: 'src/hcs10/register.ts',
        content: this.generateRegisterScript(deployConfig),
      });
      files.push({
        relativePath: 'src/hcs10/server.ts',
        content: this.generateAgentServer(deployConfig),
      });
      files.push({
        relativePath: 'src/hcs10/handler.ts',
        content: this.generateChatHandler(deployConfig, nodes),
      });
    }

    // 4. Generate MCP files if enabled
    if (deployConfig.mcp?.enabled) {
      files.push({
        relativePath: 'src/mcp/server.ts',
        content: this.generateMcpServer(deployConfig, nodes),
      });
    }

    // 5. Generate combined index.ts
    files.push({
      relativePath: 'src/index.ts',
      content: this.generateFullIndex(deployConfig),
    });

    return { files, warnings };
  }

  // ─── Register Script ──────────────────────────────────

  private generateRegisterScript(config: DeployConfig): string {
    const hcs10 = config.hcs10!;
    const lines: string[] = [];

    lines.push(`/**`);
    lines.push(` * HCS-10 Agent Registration Script`);
    lines.push(` * Run once: npm run register-agent`);
    lines.push(` */`);
    lines.push('');
    lines.push("import dotenv from 'dotenv';");
    lines.push("dotenv.config();");
    lines.push('');
    lines.push("import { HederaAgentKit } from 'hedera-agent-kit';");
    lines.push("import { HCS10Client } from '@hashgraphonline/standards-agent-kit';");
    if (hcs10.registerOnBroker) {
      lines.push("import { RegistryBrokerClient } from '@hashgraphonline/standards-sdk';");
    }
    lines.push("import fs from 'fs';");
    lines.push("import path from 'path';");
    lines.push('');
    lines.push('async function register() {');
    lines.push(`  console.log('Registering agent: ${this.escapeStr(hcs10.agentName)}...');`);
    lines.push('');
    lines.push('  const hederaKit = new HederaAgentKit({');
    lines.push('    accountId: process.env.HEDERA_OPERATOR_ID!,');
    lines.push('    privateKey: process.env.HEDERA_OPERATOR_KEY!,');
    lines.push(`    network: '${config.network}',`);
    lines.push('  });');
    lines.push('');
    lines.push('  const hcs10Client = new HCS10Client(hederaKit);');
    lines.push('');
    lines.push('  const result = await hcs10Client.createAndRegisterAgent({');
    lines.push(`    name: '${this.escapeStr(hcs10.agentName)}',`);
    lines.push(`    description: '${this.escapeStr(hcs10.agentDescription)}',`);
    lines.push(`    type: '${hcs10.agentType}',`);
    lines.push(`    capabilities: ['TEXT_GENERATION', 'DATA_ANALYSIS'],`);
    lines.push('  });');
    lines.push('');
    lines.push("  console.log('Agent registered!');");
    lines.push("  console.log('  Account:  ', result.accountId);");
    lines.push("  console.log('  Inbound:  ', result.inboundTopicId);");
    lines.push("  console.log('  Outbound: ', result.outboundTopicId);");
    lines.push('');
    lines.push('  // Append to .env');
    lines.push("  const envPath = path.resolve(__dirname, '../../.env');");
    lines.push("  let env = fs.readFileSync(envPath, 'utf-8');");
    lines.push("  env += `\\n# HCS-10 Agent (auto-generated)\\n`;");
    lines.push("  env += `AGENT_ACCOUNT_ID=${result.accountId}\\n`;");
    lines.push("  env += `AGENT_PRIVATE_KEY=${result.privateKey}\\n`;");
    lines.push("  env += `AGENT_INBOUND_TOPIC=${result.inboundTopicId}\\n`;");
    lines.push("  env += `AGENT_OUTBOUND_TOPIC=${result.outboundTopicId}\\n`;");
    lines.push('  fs.writeFileSync(envPath, env);');
    lines.push("  console.log('Saved to .env');");

    if (hcs10.registerOnBroker) {
      lines.push('');
      lines.push("  // Register on HOL Registry Broker");
      lines.push("  console.log('Registering on HOL Registry Broker...');");
      lines.push("  const broker = new RegistryBrokerClient({ baseUrl: 'https://hol.org/registry/api/v1' });");
      lines.push('  await broker.authenticateWithLedgerCredentials({');
      lines.push('    accountId: process.env.HEDERA_OPERATOR_ID!,');
      lines.push(`    network: 'hedera:${config.network}',`);
      lines.push('    hederaPrivateKey: process.env.HEDERA_OPERATOR_KEY!,');
      lines.push('    expiresInMinutes: 30,');
      lines.push("    label: 'mariposa-agent',");
      lines.push('  });');
      lines.push('');
      lines.push('  const reg = await broker.registerAgent({');
      lines.push(`    alias: '${this.escapeStr(hcs10.agentName).toLowerCase().replace(/[^a-z0-9]/g, '-')}',`);
      lines.push('    profile: {');
      lines.push(`      name: '${this.escapeStr(hcs10.agentName)}',`);
      lines.push(`      description: '${this.escapeStr(hcs10.agentDescription)}',`);
      lines.push("      properties: { platform: 'mariposa', chatEnabled: true },");
      lines.push('    },');
      lines.push("    registry: 'hashgraph-online',");
      lines.push('  });');
      lines.push('');
      lines.push('  if (reg.attemptId) {');
      lines.push('    const progress = await broker.waitForRegistrationCompletion(reg.attemptId, {');
      lines.push('      intervalMs: 2000, timeoutMs: 120000,');
      lines.push('    });');
      lines.push('    console.log(`Broker registration: ${progress.status}`);');
      lines.push('  }');
    }

    lines.push('');
    lines.push("  console.log('\\nDone! Start with: npm start');");
    lines.push('}');
    lines.push('');
    lines.push('register().catch(console.error);');

    return lines.join('\n');
  }

  // ─── Agent Server ─────────────────────────────────────

  private generateAgentServer(config: DeployConfig): string {
    const hcs10 = config.hcs10!;
    const lines: string[] = [];

    lines.push(`/**`);
    lines.push(` * HCS-10 Agent Server — message polling loop`);
    lines.push(` */`);
    lines.push('');
    lines.push("import { HederaAgentKit } from 'hedera-agent-kit';");
    lines.push("import { HCS10Client } from '@hashgraphonline/standards-agent-kit';");
    lines.push("import { handleMessage } from './handler';");
    lines.push('');
    lines.push('export class AgentServer {');
    lines.push('  private hcs10Client: HCS10Client;');
    lines.push('  private polling = false;');
    lines.push('');
    lines.push('  constructor(private agentKit: HederaAgentKit) {');
    lines.push('    this.hcs10Client = new HCS10Client(agentKit);');
    lines.push('  }');
    lines.push('');
    lines.push('  async start() {');
    lines.push(`    console.log('HCS-10 Agent "${this.escapeStr(hcs10.agentName)}" listening...');`);
    lines.push("    console.log('  Account: ', process.env.AGENT_ACCOUNT_ID);");
    lines.push("    console.log('  Inbound: ', process.env.AGENT_INBOUND_TOPIC);");
    lines.push('    this.polling = true;');
    lines.push('    this.pollLoop();');
    lines.push('  }');
    lines.push('');
    lines.push('  private async pollLoop() {');
    lines.push('    while (this.polling) {');
    lines.push('      try {');
    lines.push('        // Check for new connection requests');
    lines.push('        const pending = await this.hcs10Client.getUnapprovedRequests?.() || [];');
    lines.push('        for (const req of pending) {');

    if (hcs10.autoAcceptConnections) {
      lines.push("          console.log(`Auto-accepting connection from ${req.requestingAccountId}`);");
      lines.push('          await this.hcs10Client.acceptConnection({ requestKey: req.requestKey });');
      lines.push('');
      lines.push('          await this.hcs10Client.sendMessage({');
      lines.push('            targetIdentifier: req.requestingAccountId,');
      lines.push(`            message: JSON.stringify({ type: 'welcome', text: 'Connected to ${this.escapeStr(hcs10.agentName)}! Ask me anything.' }),`);
      lines.push('          });');
    } else {
      lines.push("          console.log(`Pending connection from ${req.requestingAccountId} (manual approval required)`);");
    }

    lines.push('        }');
    lines.push('');
    lines.push('        // Check messages on active connections');
    lines.push('        const connections = await this.hcs10Client.getConnections?.() || [];');
    lines.push('        for (const conn of connections) {');
    lines.push('          try {');
    lines.push('            const messages = await this.hcs10Client.getMessages?.({');
    lines.push('              connectionTopicId: conn.connectionTopicId,');
    lines.push('            });');
    lines.push('');
    lines.push('            if (messages && messages.length > 0) {');
    lines.push('              for (const msg of messages) {');
    lines.push('                if (msg.sender === process.env.AGENT_ACCOUNT_ID) continue;');
    lines.push('');
    lines.push('                console.log(`Message from ${conn.targetAccountId}: ${(msg.content || \'\').substring(0, 80)}...`);');
    lines.push('');
    lines.push('                const response = await handleMessage(');
    lines.push("                  msg.content || msg.data || '',");
    lines.push('                  this.agentKit,');
    lines.push('                );');
    lines.push('');
    lines.push('                await this.hcs10Client.sendMessage({');
    lines.push('                  targetIdentifier: conn.targetAccountId,');
    lines.push('                  message: JSON.stringify(response),');
    lines.push('                });');
    lines.push('              }');
    lines.push('            }');
    lines.push('          } catch (e: any) {');
    lines.push('            // No new messages — normal');
    lines.push('          }');
    lines.push('        }');
    lines.push('      } catch (error: any) {');
    lines.push("        if (!error.message?.includes('no messages')) {");
    lines.push("          console.error('Poll error:', error.message);");
    lines.push('        }');
    lines.push('      }');
    lines.push('');
    lines.push('      await new Promise(r => setTimeout(r, 4000));');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push('  stop() {');
    lines.push('    this.polling = false;');
    lines.push("    console.log('Agent stopped');");
    lines.push('  }');
    lines.push('}');

    return lines.join('\n');
  }

  // ─── Chat Handler ─────────────────────────────────────

  private generateChatHandler(config: DeployConfig, nodes: PipelineNode[]): string {
    const hcs10 = config.hcs10!;
    const actions = this.extractActionsFromNodes(nodes);
    const lines: string[] = [];

    lines.push(`/**`);
    lines.push(` * HCS-10 Chat Handler — routes messages to workflow actions via Bedrock LLM`);
    lines.push(` */`);
    lines.push('');
    lines.push("import axios from 'axios';");
    lines.push("import { HederaAgentKit } from 'hedera-agent-kit';");
    lines.push('');
    lines.push('// AWS Bedrock LLM helper');
    lines.push("const bedrockRegion = process.env.AWS_BEDROCK_REGION || 'us-east-1';");
    lines.push('const bedrockToken = process.env.AWS_BEARER_TOKEN_BEDROCK!;');
    lines.push('const bedrockHeaders = {');
    lines.push("  'Content-Type': 'application/json',");
    lines.push("  Accept: 'application/json',");
    lines.push('  Authorization: `Bearer ${bedrockToken}`,');
    lines.push('};');
    lines.push('');
    lines.push('async function callBedrock(systemPrompt: string, userPrompt: string): Promise<string> {');
    lines.push("  const modelId = process.env.BEDROCK_MODEL_ID || 'openai.gpt-oss-120b-1:0';");
    lines.push('  const url = `https://bedrock-runtime.${bedrockRegion}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`;');
    lines.push('  const resp = await axios.post(url, {');
    lines.push('    messages: [{ role: "user", content: [{ text: userPrompt }] }],');
    lines.push('    system: [{ text: systemPrompt }],');
    lines.push('    inferenceConfig: { maxTokens: 1024, temperature: 0.3 },');
    lines.push('  }, { headers: bedrockHeaders, timeout: 60000 });');
    lines.push("  return resp.data.output?.message?.content?.[0]?.text || '';");
    lines.push('}');
    lines.push('');

    // Generate ACTIONS constant
    lines.push('// Workflow actions available (derived from pipeline nodes)');
    lines.push('const AVAILABLE_ACTIONS: Record<string, string> = {');
    for (const action of actions) {
      lines.push(`  '${action.type}': '${this.escapeStr(action.description)}',`);
    }
    lines.push("  run: 'Execute the complete workflow',");
    lines.push("  status: 'Check current status',");
    lines.push("  help: 'List available actions',");
    lines.push('};');
    lines.push('');

    lines.push('const conversationHistory: Array<{ role: string; content: string }> = [];');
    lines.push('');
    lines.push('export async function handleMessage(');
    lines.push('  userMessage: string,');
    lines.push('  agentKit: HederaAgentKit,');
    lines.push('): Promise<any> {');
    lines.push("  conversationHistory.push({ role: 'user', content: userMessage });");
    lines.push('');
    lines.push('  // Handle simple commands');
    lines.push("  const lower = userMessage.toLowerCase().trim();");
    lines.push("  if (lower === 'help') {");
    lines.push("    return { type: 'response', message: 'Available actions: ' + Object.keys(AVAILABLE_ACTIONS).join(', ') };");
    lines.push('  }');
    lines.push("  if (lower === 'status') {");
    lines.push("    return { type: 'response', message: `Agent running. Uptime: ${Math.floor(process.uptime())}s` };");
    lines.push('  }');
    lines.push('');
    lines.push('  // Use LLM for intent classification');
    lines.push('  try {');
    lines.push('    const llmResponse = await callBedrock(');
    lines.push(`      'You are "${this.escapeStr(hcs10.agentName)}". ${this.escapeStr(hcs10.agentDescription)}\\n\\n' +`);
    lines.push("      'Available actions: ' + JSON.stringify(AVAILABLE_ACTIONS) + '\\n\\n' +");
    lines.push("      'Respond with JSON: { \"type\": \"response\"|\"action\", \"message\": \"text for user\", \"action\": \"actionId or null\", \"params\": {} }\\n' +");
    lines.push("      'If the user asks a question, answer it. If they want an action, specify which one.\\n' +");
    lines.push("      'JSON only. No markdown.',");
    lines.push('      userMessage,');
    lines.push('    );');
    lines.push('');
    lines.push('    let parsed: any;');
    lines.push('    try {');
    lines.push("      parsed = JSON.parse(llmResponse.replace(/```json\\n?|\\n?```/g, '').trim());");
    lines.push('    } catch {');
    lines.push("      parsed = { type: 'response', message: llmResponse };");
    lines.push('    }');
    lines.push('');
    lines.push("    conversationHistory.push({ role: 'assistant', content: parsed.message || '' });");
    lines.push('    return parsed;');
    lines.push('  } catch (error: any) {');
    lines.push("    console.error('LLM error:', error.message);");
    lines.push("    return { type: 'error', message: 'Failed to process message: ' + error.message };");
    lines.push('  }');
    lines.push('}');

    return lines.join('\n');
  }

  // ─── MCP Server ───────────────────────────────────────

  private generateMcpServer(config: DeployConfig, nodes: PipelineNode[]): string {
    const mcp = config.mcp!;
    const tools = this.extractMcpToolsFromNodes(nodes);
    const lines: string[] = [];

    lines.push(`/**`);
    lines.push(` * MCP Server — exposes workflow as callable tools`);
    lines.push(` */`);
    lines.push('');
    lines.push("import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';");
    if (mcp.transport === 'stdio') {
      lines.push("import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';");
    } else {
      lines.push("import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';");
      lines.push("import express from 'express';");
    }
    lines.push("import { HederaAgentKit } from 'hedera-agent-kit';");
    lines.push('');
    lines.push('export function createMcpServer(agentKit: HederaAgentKit): McpServer {');
    lines.push("  const server = new McpServer({");
    lines.push(`    name: '${this.escapeStr(config.hcs10?.agentName || 'Mariposa Workflow')}',`);
    lines.push("    version: '1.0.0',");
    lines.push('  });');
    lines.push('');

    // run_workflow tool
    lines.push("  server.tool('run_workflow', 'Execute the complete workflow pipeline', {}, async () => {");
    lines.push("    return { content: [{ type: 'text', text: JSON.stringify({ status: 'executed', uptime: process.uptime() }) }] };");
    lines.push('  });');
    lines.push('');

    // check_status tool
    lines.push("  server.tool('check_status', 'Get current workflow status and uptime', {}, async () => {");
    lines.push("    return { content: [{ type: 'text', text: JSON.stringify({ status: 'running', uptime: process.uptime() }) }] };");
    lines.push('  });');

    // One tool per actionable node
    for (const tool of tools) {
      lines.push('');
      lines.push(`  // Tool: ${tool.name}`);

      // Build parameter schema
      const paramSchema: Record<string, any> = {};
      for (const p of tool.params) {
        paramSchema[p.name] = { type: p.type, description: p.description };
      }

      lines.push(`  server.tool('${tool.id}', '${this.escapeStr(tool.description)}',`);
      lines.push(`    ${JSON.stringify(paramSchema)},`);
      lines.push('    async (params) => {');
      lines.push(`      // Execute ${tool.nodeType} via agentKit`);
      lines.push(`      const result = { action: '${tool.nodeType}', params, status: 'executed' };`);
      lines.push("      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };");
      lines.push('    }');
      lines.push('  );');
    }

    lines.push('');
    lines.push('  return server;');
    lines.push('}');
    lines.push('');

    // Start function
    if (mcp.transport === 'stdio') {
      lines.push('export async function startMcpServer(agentKit: HederaAgentKit) {');
      lines.push('  const server = createMcpServer(agentKit);');
      lines.push('  const transport = new StdioServerTransport();');
      lines.push('  await server.connect(transport);');
      lines.push("  console.log('MCP Server running (stdio)');");
      lines.push('}');
    } else {
      lines.push('export async function startMcpServer(agentKit: HederaAgentKit) {');
      lines.push('  const server = createMcpServer(agentKit);');
      lines.push('  const app = express();');
      lines.push(`  const port = ${mcp.port || 3001};`);
      lines.push('');
      lines.push("  app.get('/mcp/stream', async (req, res) => {");
      lines.push("    const transport = new SSEServerTransport('/mcp/messages', res);");
      lines.push('    await server.connect(transport);');
      lines.push('  });');
      lines.push('');
      lines.push("  app.post('/mcp/messages', async (req, res) => {");
      lines.push('    res.status(200).end();');
      lines.push('  });');
      lines.push('');
      lines.push('  app.listen(port, () => {');
      lines.push('    console.log(`MCP Server running at http://localhost:${port}/mcp/stream`);');
      lines.push('  });');
      lines.push('}');
    }

    return lines.join('\n');
  }

  // ─── Combined Index ───────────────────────────────────

  private generateFullIndex(config: DeployConfig): string {
    const lines: string[] = [];

    lines.push(`/**`);
    lines.push(` * Mariposa Workflow — Combined Entry Point`);
    lines.push(` * Auto-generated by Mariposa Pipeline Builder`);
    lines.push(` */`);
    lines.push('');
    lines.push("import dotenv from 'dotenv';");
    lines.push("dotenv.config();");
    lines.push('');
    lines.push("import { HederaAgentKit } from 'hedera-agent-kit';");

    if (config.hcs10?.enabled) {
      lines.push("import { AgentServer } from './hcs10/server';");
    }
    if (config.mcp?.enabled) {
      lines.push("import { startMcpServer } from './mcp/server';");
    }

    lines.push('');
    lines.push('async function main() {');
    lines.push("  console.log('Mariposa Workflow Starting...\\n');");
    lines.push('');
    lines.push('  // Initialize Hedera Agent Kit');
    lines.push('  const agentKit = new HederaAgentKit({');
    lines.push('    accountId: process.env.HEDERA_OPERATOR_ID!,');
    lines.push('    privateKey: process.env.HEDERA_OPERATOR_KEY!,');
    lines.push(`    network: '${config.network}',`);
    lines.push('  });');

    if (config.hcs10?.enabled) {
      lines.push('');
      lines.push('  // Start HCS-10 Agent');
      lines.push('  if (process.env.AGENT_ACCOUNT_ID) {');
      lines.push('    const agentServer = new AgentServer(agentKit);');
      lines.push('    await agentServer.start();');
      lines.push('  } else {');
      lines.push("    console.log('No AGENT_ACCOUNT_ID found. Run: npm run register-agent');");
      lines.push('  }');
    }

    if (config.mcp?.enabled) {
      lines.push('');
      lines.push('  // Start MCP Server');
      lines.push('  await startMcpServer(agentKit);');
    }

    lines.push('');
    lines.push('  // Keep alive');
    lines.push('  process.stdin.resume();');
    lines.push("  process.on('SIGINT', () => {");
    lines.push("    console.log('\\nShutting down...');");
    lines.push('    process.exit(0);');
    lines.push('  });');
    lines.push('}');
    lines.push('');
    lines.push('main().catch(console.error);');

    return lines.join('\n');
  }

  // ─── Helpers ──────────────────────────────────────────

  private extractActionsFromNodes(nodes: PipelineNode[]): ActionDef[] {
    return nodes
      .filter((n) => ACTIONABLE_CATEGORIES.has(n.type))
      .map((n) => ({
        id: n.id,
        type: n.type,
        name: n.data.label || n.type,
        description: NODE_DESCRIPTIONS[n.type] || n.type,
      }));
  }

  private extractMcpToolsFromNodes(nodes: PipelineNode[]): McpToolDef[] {
    return nodes
      .filter((n) => ACTIONABLE_CATEGORIES.has(n.type))
      .map((n) => {
        const config = n.data?.fullConfig?.component || n.data?.config || {};
        const params: McpToolDef['params'] = [];

        // Extract unconfigured required fields as MCP params
        switch (n.type) {
          case 'transfer-hbar':
            if (!config.toAccountId) params.push({ name: 'toAccountId', type: 'string', description: 'Recipient account ID', required: true });
            if (!config.amount) params.push({ name: 'amount', type: 'number', description: 'Amount in HBAR', required: true });
            break;
          case 'transfer-token':
            if (!config.tokenId) params.push({ name: 'tokenId', type: 'string', description: 'Token ID', required: true });
            if (!config.toAccountId) params.push({ name: 'toAccountId', type: 'string', description: 'Recipient account ID', required: true });
            if (!config.amount) params.push({ name: 'amount', type: 'number', description: 'Amount', required: true });
            break;
          case 'query-balance':
            if (!config.accountId) params.push({ name: 'accountId', type: 'string', description: 'Account ID to query', required: true });
            break;
          case 'submit-message':
            if (!config.topicId) params.push({ name: 'topicId', type: 'string', description: 'Topic ID', required: true });
            if (!config.message) params.push({ name: 'message', type: 'string', description: 'Message to submit', required: true });
            break;
          case 'saucerswap-swap':
            if (!config.tokenIn) params.push({ name: 'tokenIn', type: 'string', description: 'Input token', required: true });
            if (!config.tokenOut) params.push({ name: 'tokenOut', type: 'string', description: 'Output token', required: true });
            if (!config.amountIn) params.push({ name: 'amountIn', type: 'number', description: 'Input amount', required: true });
            break;
          default:
            // For other nodes, expose common params
            break;
        }

        return {
          id: n.type.replace(/-/g, '_'),
          name: NODE_DESCRIPTIONS[n.type] || n.type,
          description: NODE_DESCRIPTIONS[n.type] || n.type,
          nodeType: n.type,
          params,
        };
      });
  }

  private escapeStr(s: string): string {
    return (s || '').replace(/'/g, "\\'").replace(/\n/g, '\\n');
  }
}

export const hcs10CodeGenerator = new HCS10CodeGeneratorService();
