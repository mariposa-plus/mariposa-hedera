import HederaWorkflow from '../models/HederaWorkflow';
import HederaProject from '../models/HederaProject';
import { hederaCodeGenerator } from './hederaCodeGenerator.service';
import { hederaProjectManager } from './hederaProjectManager.service';

class HederaWorkflowService {
  async generateFromPipeline(pipelineId: string, userId: string): Promise<any> {
    // Find or create project for user
    let project = await HederaProject.findOne({ userId });

    if (!project) {
      const workspacePath = await hederaProjectManager.createProject(userId, 'default-workspace');
      project = await HederaProject.create({
        userId,
        name: 'Default Workspace',
        workspacePath,
        hederaNetwork: 'testnet',
        status: 'created',
      });
    }

    // Generate code
    const generated = await hederaCodeGenerator.generateFromPipeline(pipelineId);

    // Write to disk
    await hederaProjectManager.writeWorkflowFiles(project.workspacePath, generated.fullCode);

    // Save workflow record
    const workflow = await HederaWorkflow.findOneAndUpdate(
      { pipelineId, userId },
      {
        projectId: project._id,
        userId,
        pipelineId,
        generatedCode: generated.fullCode,
        generatedAt: new Date(),
        status: generated.warnings.length > 0 ? 'generated' : 'valid',
        validationErrors: generated.warnings,
      },
      { upsert: true, new: true }
    );

    return workflow;
  }
}

export const hederaWorkflowService = new HederaWorkflowService();
