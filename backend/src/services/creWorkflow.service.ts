import CREWorkflow, { ICREWorkflow } from '../models/CREWorkflow';
import { creCodeGenerator } from './creCodeGenerator.service';
import { creProjectManager } from './creProjectManager.service';

class CREWorkflowService {
  /**
   * Generate CRE TypeScript workflow code from a pipeline canvas
   * and write it to the project directory
   */
  async generateWorkflow(
    pipelineId: string,
    projectId: string,
    userId: string
  ): Promise<ICREWorkflow> {
    // Generate code from pipeline
    const result = await creCodeGenerator.generateFromPipeline(pipelineId);

    // Derive workflow name from pipeline
    const Pipeline = (await import('../models/Pipeline')).default;
    const pipeline = await Pipeline.findById(pipelineId);
    const workflowName = pipeline?.name
      ? pipeline.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : 'workflow';

    // Build config JSON from pipeline nodes
    const configJson = this.buildConfigJson(pipeline?.nodes || []);

    // Write files to project directory
    const { workflowDir, mainPath } = await creProjectManager.writeWorkflowFiles(
      projectId,
      workflowName,
      result.fullCode,
      configJson
    );

    // Upsert workflow record
    const workflow = await CREWorkflow.findOneAndUpdate(
      { projectId, pipelineId },
      {
        userId,
        generatedCode: result.fullCode,
        generatedAt: new Date(),
        workflowPath: mainPath,
        status: result.warnings.length > 0 ? 'generated' : 'generated',
        validationErrors: result.warnings,
      },
      { upsert: true, new: true }
    );

    return workflow;
  }

  /**
   * Get generated workflow code
   */
  async getWorkflowCode(workflowId: string): Promise<string | null> {
    const workflow = await CREWorkflow.findById(workflowId);
    return workflow?.generatedCode || null;
  }

  /**
   * Build config.staging.json from pipeline canvas nodes
   */
  private buildConfigJson(nodes: any[]): Record<string, any> {
    const config: Record<string, any> = {};

    // Extract schedule from cron trigger
    const triggerTypes = ['cron-trigger', 'http-trigger', 'evm-log-trigger'];
    const cronNode = nodes.find((n: any) => n.type === 'cron-trigger');
    const hasAnyTrigger = nodes.some((n: any) => triggerTypes.includes(n.type));

    if (cronNode) {
      const cronConfig = cronNode.data?.fullConfig?.component || cronNode.data?.config || {};
      config.schedule = cronConfig.cronExpression || '0 */5 * * * *';
    } else if (!hasAnyTrigger) {
      // Default to cron trigger — provide a default schedule
      config.schedule = '0 */5 * * * *';
    }

    // Extract API URL from http-fetch nodes
    const httpNode = nodes.find((n: any) => n.type === 'http-fetch');
    if (httpNode) {
      const httpConfig = httpNode.data?.fullConfig?.component || httpNode.data?.config || {};
      config.apiUrl = httpConfig.url || 'https://api.example.com/data';
    }

    // Extract EVM config from chain/contract nodes
    const evmConfigs: any[] = [];
    const chainNodes = nodes.filter((n: any) =>
      ['chain-selector', 'evm-read', 'evm-write', 'evm-log-trigger'].includes(n.type)
    );
    for (const node of chainNodes) {
      const nodeConfig = node.data?.fullConfig?.component || node.data?.config || {};
      if (nodeConfig.chainSelector || nodeConfig.contractAddress) {
        evmConfigs.push({
          chainSelectorName: nodeConfig.chainSelector || 'ethereum-testnet-sepolia',
          contractAddress: nodeConfig.contractAddress || '0x0000000000000000000000000000000000000000',
        });
      }
    }
    if (evmConfigs.length > 0) {
      config.evms = evmConfigs;
    }

    return config;
  }
}

export const creWorkflowService = new CREWorkflowService();
