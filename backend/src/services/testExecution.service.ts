import TestExecution, { ITestExecution, TestMode } from '../models/TestExecution';
import Pipeline from '../models/Pipeline';
import mongoose from 'mongoose';

export class TestExecutionService {
  /**
   * Start a new test execution
   */
  async startTest(
    pipelineId: string,
    userId: string,
    mode: TestMode,
    overrides?: { amounts?: Record<string, number> }
  ): Promise<{ executionId: string; status: string; errors?: string[] }> {
    try {
      // 1. Load pipeline
      const pipeline = await Pipeline.findById(pipelineId);
      if (!pipeline) {
        return {
          executionId: '',
          status: 'validation-failed',
          errors: ['Pipeline not found'],
        };
      }

      // 2. Validate pipeline
      const validation = await this.validatePipeline(pipeline);

      // 3. Create test execution record
      const testExecution = await TestExecution.create({
        pipelineId: new mongoose.Types.ObjectId(pipelineId),
        userId: new mongoose.Types.ObjectId(userId),
        testMode: mode,
        status: 'pending',
        nodeResults: [],
        validationErrors: validation.errors,
        overrides: overrides || {},
        totalNodes: pipeline.nodes.length,
        completedNodes: 0,
        progress: 0,
        executionLogs: [],
      });

      // 4. If validation mode only, return immediately
      if (mode === 'validation') {
        await testExecution.updateOne({
          status: validation.isValid ? 'success' : 'failed',
          finishedAt: new Date(),
        });

        return {
          executionId: testExecution._id.toString(),
          status: validation.isValid ? 'validation-passed' : 'validation-failed',
          errors: validation.errors.map((e) => e.message),
        };
      }

      // 5. Start execution asynchronously
      this.executeTest(testExecution._id.toString()).catch((error) => {
        console.error('Test execution failed:', error);
      });

      return {
        executionId: testExecution._id.toString(),
        status: 'started',
      };
    } catch (error: any) {
      console.error('Error starting test:', error);
      return {
        executionId: '',
        status: 'error',
        errors: [error.message || 'Failed to start test'],
      };
    }
  }

  /**
   * Execute the test
   */
  private async executeTest(testExecutionId: string): Promise<void> {
    const testExec = await TestExecution.findById(testExecutionId).populate('pipelineId');
    if (!testExec) throw new Error('Test execution not found');

    const pipeline: any = testExec.pipelineId;

    try {
      // Update status to running
      await testExec.updateOne({
        status: 'running',
        startedAt: new Date(),
      });

      // Add initial log
      await this.addLog(testExec, 'Test execution started');
      await this.addLog(testExec, `Mode: ${testExec.testMode}`);

      // Find trigger nodes (nodes with no incoming edges)
      const triggerNodes = pipeline.nodes.filter((node: any) => {
        return !pipeline.edges.some((edge: any) => edge.target === node.id);
      });

      if (triggerNodes.length === 0) {
        throw new Error('No trigger nodes found in pipeline');
      }

      await this.addLog(testExec, `Found ${triggerNodes.length} trigger node(s)`);

      // Create execution context to store node outputs for data flow
      const executionContext: Record<string, any> = {};

      // Execute from first trigger
      for (const triggerNode of triggerNodes) {
        await this.executeNode(testExec, triggerNode, pipeline, executionContext);
      }

      // Mark as success
      await testExec.updateOne({
        status: 'success',
        finishedAt: new Date(),
        progress: 100,
        duration: Date.now() - (testExec.startedAt?.getTime() || Date.now()),
      });

      await this.addLog(testExec, 'Test execution completed successfully');
    } catch (error: any) {
      console.error('Test execution error:', error);
      await testExec.updateOne({
        status: 'failed',
        finishedAt: new Date(),
        duration: Date.now() - (testExec.startedAt?.getTime() || Date.now()),
      });
      await this.addLog(testExec, `Test execution failed: ${error.message}`);
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    testExec: ITestExecution,
    node: any,
    pipeline: any,
    executionContext: Record<string, any>
  ): Promise<void> {
    const nodeLabel = node.data?.label || node.type || node.id;

    // Update current node
    await testExec.updateOne({ currentNodeId: node.id });
    await this.addLog(testExec, `\nExecuting: ${nodeLabel} (${node.type})`);

    // Initialize node result
    const nodeResult: any = {
      nodeId: node.id,
      nodeType: node.type,
      nodeLabel,
      status: 'running',
      startedAt: new Date(),
      logs: [],
    };

    try {
      // Gather inputs from upstream nodes based on input mappings
      const inputs = this.getNodeInputs(node, pipeline, executionContext);

      // Execute based on Hedera node type
      let output: any;

      switch (node.type) {
        // --- Triggers ---
        case 'cron-trigger':
        case 'price-threshold':
        case 'webhook-trigger':
        case 'hcs-event-trigger':
          output = { success: true, nodeType: node.type, message: 'Trigger simulated' };
          await this.addLog(testExec, `  Simulated trigger: ${node.type}`);
          break;

        // --- Hedera Account ---
        case 'create-account':
        case 'transfer-hbar':
        case 'query-balance':
        case 'update-account':
          output = { success: true, nodeType: node.type, message: 'Hedera account operation simulated' };
          await this.addLog(testExec, `  Simulated Hedera account: ${node.type}`);
          break;

        // --- Hedera Token ---
        case 'create-fungible-token':
        case 'mint-token':
        case 'transfer-token':
        case 'query-token-info':
        case 'associate-token':
        case 'create-nft':
        case 'mint-nft':
        case 'approve-allowance':
          output = { success: true, nodeType: node.type, message: 'HTS token operation simulated' };
          await this.addLog(testExec, `  Simulated HTS token: ${node.type}`);
          break;

        // --- Hedera Consensus ---
        case 'create-topic':
        case 'submit-message':
        case 'query-messages':
          output = { success: true, nodeType: node.type, message: 'HCS operation simulated' };
          await this.addLog(testExec, `  Simulated HCS: ${node.type}`);
          break;

        // --- Hedera EVM ---
        case 'deploy-erc20':
        case 'deploy-erc721':
        case 'call-contract':
        case 'query-contract':
          output = { success: true, nodeType: node.type, message: 'EVM operation simulated' };
          await this.addLog(testExec, `  Simulated EVM: ${node.type}`);
          break;

        // --- Hedera Schedule ---
        case 'schedule-transaction':
          output = { success: true, nodeType: node.type, message: 'Schedule operation simulated' };
          await this.addLog(testExec, `  Simulated schedule: ${node.type}`);
          break;

        // --- DeFi ---
        case 'saucerswap-swap':
        case 'query-pool':
        case 'add-liquidity':
        case 'remove-liquidity':
        case 'bonzo-deposit':
        case 'bonzo-withdraw':
        case 'bonzo-borrow':
        case 'bonzo-repay':
        case 'query-vault-position':
          output = { success: true, nodeType: node.type, message: 'DeFi operation simulated' };
          await this.addLog(testExec, `  Simulated DeFi: ${node.type}`);
          break;

        // --- AI ---
        case 'llm-analyzer':
        case 'risk-scorer':
        case 'sentiment-analyzer':
          output = { success: true, nodeType: node.type, message: 'AI analysis simulated' };
          await this.addLog(testExec, `  Simulated AI: ${node.type}`);
          break;

        // --- Logic ---
        case 'condition':
        case 'data-transform':
        case 'loop':
        case 'delay':
          output = { success: true, nodeType: node.type, message: 'Logic operation simulated' };
          await this.addLog(testExec, `  Simulated logic: ${node.type}`);
          break;

        // --- Output ---
        case 'hcs-log':
        case 'telegram-alert':
        case 'discord-alert':
        case 'email-notification':
          output = { success: true, nodeType: node.type, message: 'Output operation simulated' };
          await this.addLog(testExec, `  Simulated output: ${node.type}`);
          break;

        default:
          output = { success: true };
          await this.addLog(testExec, `  Simulated execution for ${node.type}`);
      }

      // Update node result with success
      nodeResult.status = 'success';
      nodeResult.output = output;
      nodeResult.finishedAt = new Date();
      nodeResult.duration = Date.now() - nodeResult.startedAt.getTime();

      await this.addLog(testExec, `  Success`);

      // Store output in execution context for downstream nodes
      executionContext[node.id] = output;

      // Update test execution with node result
      await testExec.updateOne({
        $push: { nodeResults: nodeResult },
        $inc: { completedNodes: 1 },
        progress: Math.round(((testExec.completedNodes + 1) / testExec.totalNodes) * 100),
      });

      // Process outgoing edges (execute next nodes)
      const outgoingEdges = pipeline.edges.filter((e: any) => e.source === node.id);

      for (const edge of outgoingEdges) {
        const targetNode = pipeline.nodes.find((n: any) => n.id === edge.target);
        if (targetNode) {
          // Check edge condition
          const condition = edge.condition || { type: 'immediate' };

          if (condition.type === 'immediate') {
            // Execute immediately
            await this.executeNode(testExec, targetNode, pipeline, executionContext);
          } else if (condition.type === 'delay') {
            // For testing, we'll skip delays
            await this.addLog(
              testExec,
              `  Delay condition detected (${condition.delayValue} ${condition.delayUnit}) - skipping in test mode`
            );
            await this.executeNode(testExec, targetNode, pipeline, executionContext);
          } else if (condition.type === 'approval') {
            await this.addLog(testExec, `  Approval condition detected - auto-approving in test mode`);
            await this.executeNode(testExec, targetNode, pipeline, executionContext);
          }
        }
      }
    } catch (error: any) {
      // Update node result with failure
      nodeResult.status = 'failed';
      nodeResult.error = error.message;
      nodeResult.finishedAt = new Date();
      nodeResult.duration = Date.now() - nodeResult.startedAt.getTime();

      await testExec.updateOne({
        $push: { nodeResults: nodeResult },
      });

      await this.addLog(testExec, `  Failed: ${error.message}`);

      throw error; // Re-throw to stop execution
    }
  }

  /**
   * Get inputs for a node from upstream nodes based on input mappings
   */
  private getNodeInputs(
    node: any,
    pipeline: any,
    executionContext: Record<string, any>
  ): Record<string, any> {
    const inputs: Record<string, any> = {};
    const inputMappings = node.data?.fullConfig?.input?.mappings || [];

    for (const mapping of inputMappings) {
      const sourceNodeOutput = executionContext[mapping.sourceNodeId];
      if (sourceNodeOutput) {
        // Get the value from source node output using the sourceField path
        const value = this.getNestedValue(sourceNodeOutput, mapping.sourceField);
        if (value !== undefined) {
          inputs[mapping.targetField] = value;
        }
      }
    }

    return inputs;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Validate pipeline configuration
   */
  private async validatePipeline(pipeline: any): Promise<{
    isValid: boolean;
    errors: Array<{ nodeId?: string; type: string; message: string; severity: string }>;
  }> {
    const errors: any[] = [];

    // Check for trigger nodes
    const triggerNodes = pipeline.nodes.filter((node: any) => {
      return !pipeline.edges.some((edge: any) => edge.target === node.id);
    });

    if (triggerNodes.length === 0) {
      errors.push({
        type: 'configuration',
        message: 'Pipeline must have at least one trigger node',
        severity: 'error',
      });
    }

    // Check for disconnected nodes
    for (const node of pipeline.nodes) {
      const hasIncoming = pipeline.edges.some((e: any) => e.target === node.id);
      const hasOutgoing = pipeline.edges.some((e: any) => e.source === node.id);

      if (!hasIncoming && !hasOutgoing && triggerNodes.length > 0) {
        errors.push({
          nodeId: node.id,
          type: 'connection',
          message: `Node "${node.data?.label || node.id}" is disconnected`,
          severity: 'warning',
        });
      }
    }

    return {
      isValid: !errors.some((e) => e.severity === 'error'),
      errors,
    };
  }

  /**
   * Get test execution status
   */
  async getTestStatus(testExecutionId: string): Promise<ITestExecution | null> {
    return await TestExecution.findById(testExecutionId);
  }

  /**
   * Cancel test execution
   */
  async cancelTest(testExecutionId: string): Promise<void> {
    await TestExecution.findByIdAndUpdate(testExecutionId, {
      status: 'cancelled',
      finishedAt: new Date(),
    });
  }

  /**
   * Get test history for a pipeline
   */
  async getTestHistory(pipelineId: string, limit: number = 10): Promise<ITestExecution[]> {
    return await TestExecution.find({ pipelineId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Add log entry to test execution
   */
  private async addLog(testExec: ITestExecution, message: string): Promise<void> {
    const timestamp = new Date().toISOString().substring(11, 19);
    const logMessage = `[${timestamp}] ${message}`;

    await testExec.updateOne({
      $push: { executionLogs: logMessage },
    });
  }
}

export const testExecutionService = new TestExecutionService();
