import Pipeline from '../models/Pipeline';

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

class CRECodeGeneratorService {
  /**
   * Generate CRE TypeScript workflow code from a pipeline canvas
   */
  async generateFromPipeline(pipelineId: string): Promise<GeneratedWorkflow> {
    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) throw new Error('Pipeline not found');
    return this.generate(pipeline.nodes as any[], pipeline.edges as any[]);
  }

  generate(nodes: PipelineNode[], edges: PipelineEdge[]): GeneratedWorkflow {
    const warnings: string[] = [];

    // Find trigger node(s) - nodes with no incoming edges
    const targetNodeIds = new Set(edges.map(e => e.target));
    const sourceNodeIds = new Set(edges.map(e => e.source));
    const triggerNodes = nodes.filter(n => !targetNodeIds.has(n.id) && this.isTriggerNode(n));
    const nonTriggerNodes = nodes.filter(n => !this.isTriggerNode(n));

    if (triggerNodes.length === 0) {
      warnings.push('No trigger node found. Using cron trigger as default.');
    }
    if (triggerNodes.length > 1) {
      warnings.push('Multiple triggers found. Only the first will be used.');
    }

    const triggerNode = triggerNodes[0] || null;

    // Topological sort of non-trigger nodes
    const sorted = this.topologicalSort(nonTriggerNodes, edges);

    // Generate code sections
    const imports = this.generateImports(nodes);
    const configSchema = this.generateConfigSchema(nodes);
    const triggerCode = this.generateTriggerSetup(triggerNode);
    const callbackBody = this.generateCallbackBody(sorted, edges);
    const triggerPayloadType = this.getTriggerPayloadType(triggerNode);

    const fullCode = `${imports}

${configSchema}

const onTrigger = (runtime: Runtime<Config>, payload: ${triggerPayloadType}): string => {
${callbackBody}
  return "complete"
}

const initWorkflow = (config: Config) => {
${triggerCode}
}

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}

main()
`;

    return {
      fullCode,
      imports,
      configSchema,
      workflowBody: callbackBody,
      warnings,
    };
  }

  private isTriggerNode(node: PipelineNode): boolean {
    return ['cron-trigger', 'http-trigger', 'evm-log-trigger'].includes(node.type);
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

    // Kahn's algorithm
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

  private generateImports(nodes: PipelineNode[]): string {
    const types = new Set(nodes.map(n => n.type));
    const imports: string[] = [];

    // Core imports
    const coreImports = ['cre', 'Runner'];
    const typeImports = ['Runtime'];

    // Trigger-specific imports
    if (types.has('cron-trigger')) {
      typeImports.push('CronPayload');
    }
    if (types.has('http-trigger')) {
      typeImports.push('HTTPPayload');
    }
    if (types.has('evm-log-trigger')) {
      coreImports.push('getNetwork', 'hexToBase64');
      typeImports.push('EVMLog');
    }

    // Capability imports — http-fetch also requires runInNodeMode + consensus
    if (types.has('node-mode') || types.has('consensus-aggregation') || types.has('http-fetch')) {
      coreImports.push('consensusMedianAggregation');
      typeImports.push('NodeRuntime');
    }
    if (types.has('evm-read') || types.has('evm-write')) {
      coreImports.push('getNetwork', 'encodeCallMsg');
    }

    imports.push(`import { ${coreImports.join(', ')}, type ${typeImports.join(', type ')} } from "@chainlink/cre-sdk"`);
    imports.push(`import { z } from "zod"`);

    // viem imports for ABI operations
    if (types.has('abi-encode') || types.has('abi-decode') || types.has('evm-write') || types.has('evm-read')) {
      imports.push(`import { encodeFunctionData, decodeFunctionResult, encodeAbiParameters, decodeAbiParameters, parseAbiParameters } from "viem"`);
    }
    if (types.has('evm-log-trigger')) {
      imports.push(`import { keccak256, toBytes } from "viem"`);
    }

    return imports.join('\n');
  }

  private generateConfigSchema(nodes: PipelineNode[]): string {
    const fields: string[] = [];

    // Check for chain config nodes
    const hasChainConfig = nodes.some(n => ['chain-selector', 'rpc-endpoint'].includes(n.type));
    const hasContract = nodes.some(n => ['evm-read', 'evm-write', 'ireceiver-contract', 'price-feed-consumer'].includes(n.type));
    const triggerTypes = ['cron-trigger', 'http-trigger', 'evm-log-trigger'];
    const hasCron = nodes.some(n => n.type === 'cron-trigger');
    const hasAnyTrigger = nodes.some(n => triggerTypes.includes(n.type));
    const needsSchedule = hasCron || !hasAnyTrigger;

    if (needsSchedule) {
      fields.push('  schedule: z.string()');
    }

    // API URL from HTTP fetch nodes
    const httpNodes = nodes.filter(n => n.type === 'http-fetch');
    if (httpNodes.length > 0) {
      fields.push('  apiUrl: z.string().url()');
    }

    if (hasChainConfig || hasContract) {
      fields.push(`  evms: z.array(z.object({
    chainSelectorName: z.string(),
    contractAddress: z.string(),
  }))`);
    }

    // Secret references
    const secretNodes = nodes.filter(n => n.type === 'secrets-access');
    for (const node of secretNodes) {
      const secretName = node.data?.fullConfig?.component?.secretName || node.data?.config?.secretName;
      if (secretName) {
        fields.push(`  // Secret: ${secretName} (accessed via runtime.getSecret)`);
      }
    }

    return `const configSchema = z.object({
${fields.join(',\n')}
})
type Config = z.infer<typeof configSchema>`;
  }

  private getTriggerPayloadType(triggerNode: PipelineNode | null): string {
    if (!triggerNode) return 'CronPayload';
    switch (triggerNode.type) {
      case 'cron-trigger': return 'CronPayload';
      case 'http-trigger': return 'HTTPPayload';
      case 'evm-log-trigger': return 'EVMLog';
      default: return 'CronPayload';
    }
  }

  private generateTriggerSetup(triggerNode: PipelineNode | null): string {
    if (!triggerNode) {
      return `  const cron = new cre.capabilities.CronCapability()
  return [cre.handler(cron.trigger({ schedule: config.schedule }), onTrigger)]`;
    }

    const config = triggerNode.data?.fullConfig?.component || triggerNode.data?.config || {};

    switch (triggerNode.type) {
      case 'cron-trigger':
        return `  const cron = new cre.capabilities.CronCapability()
  return [cre.handler(cron.trigger({ schedule: config.schedule }), onTrigger)]`;

      case 'http-trigger':
        return `  const http = new cre.capabilities.HTTPCapability()
  return [cre.handler(http.trigger({}), onTrigger)]`;

      case 'evm-log-trigger': {
        const eventSig = config.eventSignature || 'Transfer(address,address,uint256)';
        return `  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.evms[0].chainSelectorName,
    isTestnet: true,
  })
  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)
  const eventHash = keccak256(toBytes("${eventSig}"))
  const trigger = evmClient.logTrigger({
    addresses: [hexToBase64(config.evms[0].contractAddress)],
    topics: [{ values: [hexToBase64(eventHash)] }],
  })
  return [cre.handler(trigger, onTrigger)]`;
      }

      default:
        return `  const cron = new cre.capabilities.CronCapability()
  return [cre.handler(cron.trigger({ schedule: config.schedule }), onTrigger)]`;
    }
  }

  private generateCallbackBody(sortedNodes: PipelineNode[], edges: PipelineEdge[]): string {
    const lines: string[] = [];
    const varMap = new Map<string, string>(); // nodeId -> variable name

    for (const node of sortedNodes) {
      const varName = this.sanitizeVarName(node.id);
      const config = node.data?.fullConfig?.component || node.data?.config || {};

      switch (node.type) {
        case 'http-fetch': {
          // CRE SDK requires runInNodeMode for HTTP calls (per-node execution + consensus)
          lines.push(`  // HTTP Fetch: ${node.data.label || 'API Request'}`);
          lines.push(`  const ${varName} = runtime.runInNodeMode(`);
          lines.push(`    (nodeRuntime: NodeRuntime) => {`);
          lines.push(`      const httpClient = new cre.capabilities.HTTPClient()`);
          lines.push(`      const response = httpClient.sendRequest(nodeRuntime, {`);
          lines.push(`        url: nodeRuntime.config.apiUrl,`);
          lines.push(`        method: "${config.method || 'GET'}",`);
          lines.push(`      }).result()`);
          lines.push(`      return JSON.parse(new TextDecoder().decode(response.body))`);
          lines.push(`    },`);
          lines.push(`    consensusMedianAggregation()`);
          lines.push(`  )().result()`);
          lines.push(`  runtime.log(\`HTTP response: \${JSON.stringify(${varName})}\`)`);
          break;
        }

        case 'evm-read': {
          lines.push(`  // EVM Read: ${node.data.label || 'Contract Read'}`);
          lines.push(`  const evmClient_${varName} = new cre.capabilities.EVMClient(getNetwork({`);
          lines.push(`    chainFamily: "evm",`);
          lines.push(`    chainSelectorName: config.evms[0].chainSelectorName,`);
          lines.push(`    isTestnet: true,`);
          lines.push(`  }).chainSelector.selector)`);
          lines.push(`  const ${varName} = evmClient_${varName}.callContract(runtime, {`);
          lines.push(`    call: encodeCallMsg({ from: "0x0000000000000000000000000000000000000000", to: config.evms[0].contractAddress, data: "0x" }),`);
          lines.push(`    blockNumber: "LAST_FINALIZED_BLOCK_NUMBER",`);
          lines.push(`  }).result()`);
          break;
        }

        case 'evm-write': {
          lines.push(`  // EVM Write: ${node.data.label || 'On-chain Write'}`);
          lines.push(`  const evmClient_${varName} = new cre.capabilities.EVMClient(getNetwork({`);
          lines.push(`    chainFamily: "evm",`);
          lines.push(`    chainSelectorName: config.evms[0].chainSelectorName,`);
          lines.push(`    isTestnet: true,`);
          lines.push(`  }).chainSelector.selector)`);
          lines.push(`  const report_${varName} = evmClient_${varName}.generateReport(runtime, {`);
          lines.push(`    data: "0x", // TODO: Encode data from upstream`);
          lines.push(`  }).result()`);
          lines.push(`  evmClient_${varName}.writeReport(runtime, {`);
          lines.push(`    report: report_${varName},`);
          lines.push(`    contractAddress: config.evms[0].contractAddress,`);
          lines.push(`    gasLimit: ${config.gasLimit || 1000000}n,`);
          lines.push(`  }).result()`);
          lines.push(`  runtime.log("Report written on-chain")`);
          break;
        }

        case 'node-mode': {
          const aggMethod = config.aggregationMethod || 'median';
          lines.push(`  // Node Mode: ${node.data.label || 'Node Execution'}`);
          lines.push(`  const ${varName} = runtime.runInNodeMode(`);
          lines.push(`    async (nodeRuntime: NodeRuntime<Config>): Promise<number> => {`);
          lines.push(`      // Per-node logic here`);
          lines.push(`      return 0`);
          lines.push(`    },`);
          lines.push(`    consensusMedianAggregation`);
          lines.push(`  ).result()`);
          break;
        }

        case 'secrets-access': {
          const secretName = config.secretName || 'API_KEY';
          lines.push(`  // Secret: ${secretName}`);
          lines.push(`  const ${varName} = runtime.getSecret("${secretName}")`);
          break;
        }

        case 'data-transform': {
          lines.push(`  // Transform: ${node.data.label || 'Data Transform'}`);
          lines.push(`  // TODO: Apply transform expression from config`);
          lines.push(`  const ${varName} = null // Transform result`);
          break;
        }

        case 'condition': {
          lines.push(`  // Condition: ${node.data.label || 'Branch'}`);
          lines.push(`  // TODO: Evaluate condition expression`);
          lines.push(`  const ${varName} = true // Condition result`);
          break;
        }

        case 'abi-encode': {
          const types = config.types || 'uint256';
          lines.push(`  // ABI Encode: ${node.data.label || 'Encode'}`);
          lines.push(`  const ${varName} = encodeAbiParameters(`);
          lines.push(`    parseAbiParameters("${types}"),`);
          lines.push(`    [0] // TODO: Values from upstream`);
          lines.push(`  )`);
          break;
        }

        case 'abi-decode': {
          const types = config.types || 'uint256';
          lines.push(`  // ABI Decode: ${node.data.label || 'Decode'}`);
          lines.push(`  const ${varName} = decodeAbiParameters(`);
          lines.push(`    parseAbiParameters("${types}"),`);
          lines.push(`    "0x" // TODO: Encoded data from upstream`);
          lines.push(`  )`);
          break;
        }

        case 'consensus-aggregation': {
          lines.push(`  // Consensus: ${node.data.label || 'Aggregation'}`);
          lines.push(`  // Applied via runInNodeMode aggregation parameter`);
          break;
        }

        // Config and contract nodes don't generate callback code
        default:
          break;
      }

      varMap.set(node.id, varName);
      lines.push('');
    }

    return lines.join('\n');
  }

  private sanitizeVarName(nodeId: string): string {
    // Convert node IDs like "http-fetch-1234567" to "httpFetch1234567"
    return nodeId
      .replace(/-(\w)/g, (_, c) => c.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '_');
  }
}

export const creCodeGenerator = new CRECodeGeneratorService();
