import path from 'path';
import { Request, Response } from 'express';
import { creProjectManager } from '../services/creProjectManager.service';
import { creAuth } from '../services/creAuth.service';
import { wsService } from '../services/websocket.service';
import Pipeline from '../models/Pipeline';
import CREWorkflow from '../models/CREWorkflow';
import CREContract from '../models/CREContract';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://app.mariposa.plus';

// --- Projects ---

export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Project name is required' });
    }

    const project = await creProjectManager.createProject(
      (req as any).user.id,
      name,
      description
    );

    res.status(201).json({ success: true, project });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Project name already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listProjects = async (req: Request, res: Response) => {
  try {
    const projects = await creProjectManager.listProjects((req as any).user.id);
    res.json({ success: true, projects });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProject = async (req: Request, res: Response) => {
  try {
    const project = await creProjectManager.getProject(req.params.id, (req as any).user.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, project });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    await creProjectManager.deleteProject(req.params.id, (req as any).user.id);
    res.json({ success: true, message: 'Project deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const initProject = async (req: Request, res: Response) => {
  try {
    const { workflowName } = req.body;
    if (!workflowName) {
      return res.status(400).json({ success: false, message: 'workflowName is required' });
    }

    const result = await creProjectManager.initWorkflowDeps(req.params.id, workflowName);
    res.json({ success: true, stdout: result.stdout, stderr: result.stderr });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProjectConfig = async (req: Request, res: Response) => {
  try {
    const { rpcs } = req.body;
    await creProjectManager.updateProjectConfig(req.params.id, rpcs);
    res.json({ success: true, message: 'Config updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSecrets = async (req: Request, res: Response) => {
  try {
    const { secrets } = req.body;
    await creProjectManager.updateSecrets(req.params.id, secrets);
    res.json({ success: true, message: 'Secrets updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Workflows ---

export const generateWorkflow = async (req: Request, res: Response) => {
  try {
    const { pipelineId } = req.body;
    if (!pipelineId) {
      return res.status(400).json({ success: false, message: 'pipelineId is required' });
    }

    // Resolve projectId from pipeline
    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ success: false, message: 'Pipeline not found' });
    }

    // Auto-create CRE project if pipeline doesn't have one yet (legacy pipelines)
    let projectId = pipeline.creProjectId?.toString();
    if (!projectId) {
      const creProject = await creProjectManager.createProject(
        (req as any).user.id,
        pipeline.name,
        pipeline.description
      );
      pipeline.creProjectId = creProject._id;
      await pipeline.save();
      projectId = creProject._id.toString();
    }

    const { creWorkflowService } = await import('../services/creWorkflow.service');
    const workflow = await creWorkflowService.generateWorkflow(
      pipelineId,
      projectId,
      (req as any).user.id
    );

    // Install dependencies (bun install + cre-setup via postinstall)
    const workflowName = pipeline.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'workflow';
    try {
      await creProjectManager.initWorkflowDeps(projectId, workflowName);
    } catch (depError: any) {
      console.warn('Dependency installation failed:', depError.message);
      // Don't block — workflow is still generated, user can retry simulate
    }

    res.json({ success: true, workflow });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWorkflowCode = async (req: Request, res: Response) => {
  try {
    const workflow = await CREWorkflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ success: false, message: 'Workflow not found' });
    }
    res.json({
      success: true,
      code: workflow.generatedCode,
      status: workflow.status,
      generatedAt: workflow.generatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Contracts ---

export const saveContract = async (req: Request, res: Response) => {
  try {
    const { projectId, nodeId, contractName, soliditySource, network } = req.body;
    if (!projectId || !nodeId || !contractName || !soliditySource) {
      return res.status(400).json({ success: false, message: 'projectId, nodeId, contractName, and soliditySource are required' });
    }

    const contract = await CREContract.findOneAndUpdate(
      { projectId, nodeId },
      {
        userId: (req as any).user.id,
        contractName,
        soliditySource,
        network,
        status: 'draft',
        compilationErrors: [],
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, contract });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getContract = async (req: Request, res: Response) => {
  try {
    const contract = await CREContract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }
    res.json({ success: true, contract });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const compileContract = async (req: Request, res: Response) => {
  try {
    const { solidityCompiler } = await import('../services/solidityCompiler.service');
    const result = await solidityCompiler.compileForNode(req.params.id);
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deployContract = async (req: Request, res: Response) => {
  try {
    const { rpcUrl, privateKeyEnvVar, constructorArgs } = req.body;
    if (!rpcUrl) {
      return res.status(400).json({ success: false, message: 'rpcUrl is required' });
    }

    const { solidityCompiler } = await import('../services/solidityCompiler.service');
    const result = await solidityCompiler.deployToTestnet(
      req.params.id,
      rpcUrl,
      privateKeyEnvVar || 'CRE_ETH_PRIVATE_KEY',
      constructorArgs || []
    );
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Simulation ---

export const simulateWorkflow = async (req: Request, res: Response) => {
  try {
    const { workflowName } = req.body;
    if (!workflowName) {
      return res.status(400).json({ success: false, message: 'workflowName is required' });
    }

    const { creSimulator } = await import('../services/creSimulator.service');
    // Start simulation asynchronously
    creSimulator.simulate(req.params.id, workflowName).catch(console.error);

    res.json({ success: true, message: 'Simulation started' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSimulationLogs = async (req: Request, res: Response) => {
  try {
    const project = await creProjectManager.getProject(req.params.id, (req as any).user.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({
      success: true,
      logs: project.simulationLogs || [],
      status: project.status,
      lastSimulatedAt: project.lastSimulatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- CRE Authentication ---

export const startCRELogin = async (req: Request, res: Response) => {
  try {
    const { pipelineId } = req.body;
    const result = await creAuth.startLogin(pipelineId);
    res.json({
      success: true,
      authUrl: result.modifiedAuthUrl,
      originalAuthUrl: result.originalAuthUrl,
      port: result.port,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const startCREHeadlessLogin = async (req: Request, res: Response) => {
  const { email, password, pipelineId } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  console.log(`[CRE Controller] Headless login request for email=${email}, pipelineId=${pipelineId || 'none'}`);

  try {
    const result = await creAuth.startHeadlessLogin(email, password, pipelineId);
    if (result.success) {
      wsService.emitCREAuthComplete(true);
      const status = await creAuth.checkStatus();
      console.log(`[CRE Controller] Headless login succeeded for email=${status.email}`);
      return res.json({ success: true, email: status.email });
    }
    console.error(`[CRE Controller] Headless login failed: ${result.error}`);
    return res.status(401).json({ success: false, message: result.error || 'Authentication failed' });
  } catch (error: any) {
    console.error(`[CRE Controller] Headless login exception: ${error.message}`, error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitVerificationCode = async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: 'Verification code is required' });
  }

  const { submitVerificationCode: submitCode } = await import('../services/creHeadlessBrowser.service');
  const accepted = submitCode(code);

  if (accepted) {
    res.json({ success: true, message: 'Code submitted to headless browser' });
  } else {
    res.status(409).json({ success: false, message: 'No headless login is waiting for a verification code' });
  }
};

export const getCREAuthStatus = async (req: Request, res: Response) => {
  try {
    const status = await creAuth.checkStatus();
    res.json({ success: true, ...status });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const relayCRECallback = async (req: Request, res: Response) => {
  try {
    const { callbackUrl } = req.body;
    if (!callbackUrl) {
      return res.status(400).json({ success: false, message: 'callbackUrl is required' });
    }
    const result = await creAuth.relayCallback(callbackUrl);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logoutCRE = async (req: Request, res: Response) => {
  try {
    await creAuth.logout();
    res.json({ success: true, message: 'Logged out' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Handle OAuth redirect from the identity provider.
 * This is an unauthenticated GET endpoint that receives ?code=X&state=Y,
 * relays them to CRE CLI's localhost callback server, then redirects the
 * user's browser back to the frontend.
 */
export const handleOAuthRedirect = async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code || !state) {
    const errorMsg = encodeURIComponent('Missing code or state parameter from OAuth provider');
    return res.redirect(`${FRONTEND_URL}/pipelines?cre_auth=error&message=${errorMsg}`);
  }

  try {
    const session = creAuth.getActiveSession();
    const result = await creAuth.relayOAuthCallback(code as string, state as string);

    if (result.success) {
      // Emit WebSocket event for instant detection in the modal
      wsService.emitCREAuthComplete(true);

      // Redirect to the pipeline page (or pipelines list if no pipelineId)
      const redirectPath = session?.pipelineId
        ? `/pipelines/${session.pipelineId}?cre_auth=success`
        : '/pipelines?cre_auth=success';
      return res.redirect(`${FRONTEND_URL}${redirectPath}`);
    } else {
      const errorMsg = encodeURIComponent(result.message || 'Failed to complete authentication');
      const redirectPath = session?.pipelineId
        ? `/pipelines/${session.pipelineId}?cre_auth=error&message=${errorMsg}`
        : `/pipelines?cre_auth=error&message=${errorMsg}`;
      return res.redirect(`${FRONTEND_URL}${redirectPath}`);
    }
  } catch (error: any) {
    const errorMsg = encodeURIComponent(error.message || 'OAuth callback failed');
    return res.redirect(`${FRONTEND_URL}/pipelines?cre_auth=error&message=${errorMsg}`);
  }
};

// --- Pipeline-based simulation (resolves project from pipeline) ---

export const simulateByPipeline = async (req: Request, res: Response) => {
  try {
    const pipeline = await Pipeline.findById(req.params.pipelineId);
    if (!pipeline) {
      return res.status(404).json({ success: false, message: 'Pipeline not found' });
    }

    if (!pipeline.creProjectId) {
      return res.status(400).json({ success: false, message: 'Pipeline has no CRE project. Generate code first.' });
    }

    const workflow = await CREWorkflow.findOne({
      pipelineId: req.params.pipelineId,
      projectId: pipeline.creProjectId,
    });
    if (!workflow?.workflowPath) {
      return res.status(400).json({
        success: false,
        message: 'No workflow found for this pipeline. Please generate code first.',
      });
    }
    const wfName = path.basename(path.dirname(workflow.workflowPath));

    const { creSimulator } = await import('../services/creSimulator.service');
    creSimulator.simulate(pipeline.creProjectId.toString(), wfName).catch(console.error);

    res.json({ success: true, message: 'Simulation started', projectId: pipeline.creProjectId });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
