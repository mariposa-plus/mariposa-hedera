import { exec } from 'child_process';
import { Request, Response } from 'express';
import { hederaProjectManager } from '../services/hederaProjectManager.service';
import { hederaCodeGenerator } from '../services/hederaCodeGenerator.service';
import { hcs10CodeGenerator } from '../services/hcs10CodeGenerator.service';
import HederaProject from '../models/HederaProject';
import HederaWorkflow from '../models/HederaWorkflow';
import Pipeline from '../models/Pipeline';

// --- Projects ---

export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, description, hederaNetwork } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Project name is required' });
    }

    const project = await hederaProjectManager.createProject(
      (req as any).user.id,
      name,
      description,
      hederaNetwork
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
    const projects = await HederaProject.find({ userId: (req as any).user.id })
      .sort({ updatedAt: -1 });
    res.json({ success: true, projects });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProject = async (req: Request, res: Response) => {
  try {
    const project = await HederaProject.findOne({
      _id: req.params.id,
      userId: (req as any).user.id,
    });
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
    await hederaProjectManager.deleteProject(req.params.id, (req as any).user.id);
    res.json({ success: true, message: 'Project deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const initProject = async (req: Request, res: Response) => {
  try {
    const project = await HederaProject.findOne({
      _id: req.params.id,
      userId: (req as any).user.id,
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const result = await hederaProjectManager.initProject(project.workspacePath);

    project.status = 'ready';
    await project.save();

    res.json({ success: true, stdout: result.stdout, stderr: result.stderr });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProjectConfig = async (req: Request, res: Response) => {
  try {
    const { hederaNetwork } = req.body;
    const project = await HederaProject.findOne({
      _id: req.params.id,
      userId: (req as any).user.id,
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (hederaNetwork === 'mainnet' || hederaNetwork === 'testnet') {
      project.hederaNetwork = hederaNetwork;
    }

    await project.save();

    res.json({ success: true, message: 'Config updated', project });
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

    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ success: false, message: 'Pipeline not found' });
    }

    // Auto-create Hedera project if pipeline doesn't have one yet
    let project;
    if (pipeline.hederaProjectId) {
      project = await HederaProject.findById(pipeline.hederaProjectId);
    }

    if (!project) {
      project = await hederaProjectManager.createProject(
        (req as any).user.id,
        pipeline.name,
        pipeline.description
      );
      pipeline.hederaProjectId = project._id;
      await pipeline.save();
    }

    // Generate code from pipeline
    const generated = await hederaCodeGenerator.generateFromPipeline(pipelineId);
    const code = generated.fullCode;

    // Save workflow to DB
    const workflow = await HederaWorkflow.findOneAndUpdate(
      { pipelineId, projectId: project._id },
      {
        userId: (req as any).user.id,
        generatedCode: code,
        generatedAt: new Date(),
        status: 'generated',
        validationErrors: [],
      },
      { upsert: true, new: true }
    );

    // Write generated files to project workspace
    await hederaProjectManager.writeWorkflowFiles(project.workspacePath, code);

    res.json({ success: true, workflow });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Deploy with HCS-10 / MCP ---

export const generateWithDeploy = async (req: Request, res: Response) => {
  try {
    const { pipelineId, deployConfig } = req.body;
    if (!pipelineId) {
      return res.status(400).json({ success: false, message: 'pipelineId is required' });
    }
    if (!deployConfig) {
      return res.status(400).json({ success: false, message: 'deployConfig is required' });
    }

    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ success: false, message: 'Pipeline not found' });
    }

    // Create project with HCS-10/MCP dependencies
    let project;
    if (pipeline.hederaProjectId) {
      project = await HederaProject.findById(pipeline.hederaProjectId);
    }

    if (!project) {
      project = await hederaProjectManager.createProject(
        (req as any).user.id,
        pipeline.name,
        pipeline.description,
        deployConfig.network || 'testnet',
        {
          hcs10: deployConfig.hcs10?.enabled,
          mcp: deployConfig.mcp?.enabled,
        },
      );
      pipeline.hederaProjectId = project._id;
      await pipeline.save();
    }

    // Generate all project files
    const { files, warnings } = hcs10CodeGenerator.generateProjectFiles(
      pipeline.nodes as any[],
      pipeline.edges as any[],
      deployConfig,
    );

    // Write files to project workspace
    await hederaProjectManager.writeMultipleFiles(project.workspacePath, files);

    // Construct combined code for DB storage
    const combinedCode = files
      .map((f) => `// ===== ${f.relativePath} =====\n${f.content}`)
      .join('\n\n');

    const fileList = files.map((f) => f.relativePath);

    // Save workflow to DB
    const workflow = await HederaWorkflow.findOneAndUpdate(
      { pipelineId, projectId: project._id },
      {
        userId: (req as any).user.id,
        generatedCode: combinedCode,
        generatedAt: new Date(),
        status: 'generated',
        validationErrors: warnings,
        deployConfig: {
          hcs10Enabled: !!deployConfig.hcs10?.enabled,
          mcpEnabled: !!deployConfig.mcp?.enabled,
          network: deployConfig.network || 'testnet',
          agentName: deployConfig.hcs10?.agentName || '',
        },
        generatedFiles: fileList,
      },
      { upsert: true, new: true },
    );

    res.json({
      success: true,
      workflow,
      generatedFiles: fileList,
      projectPath: project.workspacePath,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWorkflowCode = async (req: Request, res: Response) => {
  try {
    const workflow = await HederaWorkflow.findById(req.params.id);
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
