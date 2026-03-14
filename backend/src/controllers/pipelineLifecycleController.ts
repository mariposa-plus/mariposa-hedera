import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Pipeline from '../models/Pipeline';

/**
 * Activate a pipeline - put it in monitoring mode
 * @route POST /api/pipelines/:pipelineId/activate
 */
export const activatePipeline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pipelineId } = req.params;
    const userId = req.user?._id;

    const pipeline = await Pipeline.findOne({ _id: pipelineId, userId });

    if (!pipeline) {
      res.status(404).json({
        success: false,
        message: 'Pipeline not found',
      });
      return;
    }

    if (pipeline.isActive && pipeline.status === 'active') {
      res.status(400).json({
        success: false,
        message: 'Pipeline is already active',
      });
      return;
    }

    // Update pipeline status
    pipeline.isActive = true;
    pipeline.status = 'activating';
    pipeline.lastActivatedAt = new Date();
    pipeline.errorMessage = undefined;
    await pipeline.save();

    try {
      // TODO: Register Hedera trigger watchers (cron-trigger, price-threshold, webhook-trigger, hcs-event-trigger)
      // For now, just mark as active
      const triggerNodes = pipeline.nodes.filter(
        (node) =>
          node.type === 'cron-trigger' ||
          node.type === 'price-threshold' ||
          node.type === 'webhook-trigger' ||
          node.type === 'hcs-event-trigger'
      );

      console.log(`Found ${triggerNodes.length} trigger node(s) for pipeline: ${pipelineId}`);

      // Mark as fully active
      pipeline.status = 'active';
      await pipeline.save();

      console.log(`Pipeline activated: ${pipeline.name} (${pipeline._id})`);

      res.status(200).json({
        success: true,
        data: {
          pipelineId: pipeline._id,
          status: pipeline.status,
          isActive: pipeline.isActive,
          lastActivatedAt: pipeline.lastActivatedAt,
          triggersCount: triggerNodes.length,
        },
        message: 'Pipeline activated successfully',
      });
    } catch (error: any) {
      // Rollback on error
      pipeline.status = 'error';
      pipeline.isActive = false;
      pipeline.errorMessage = error.message;
      await pipeline.save();

      throw error;
    }
  } catch (error: any) {
    console.error('Error activating pipeline:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to activate pipeline',
    });
  }
};

/**
 * Deactivate a pipeline - stop monitoring
 * @route POST /api/pipelines/:pipelineId/deactivate
 */
export const deactivatePipeline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pipelineId } = req.params;
    const userId = req.user?._id;

    const pipeline = await Pipeline.findOne({ _id: pipelineId, userId });

    if (!pipeline) {
      res.status(404).json({
        success: false,
        message: 'Pipeline not found',
      });
      return;
    }

    if (!pipeline.isActive && pipeline.status === 'stopped') {
      res.status(400).json({
        success: false,
        message: 'Pipeline is already stopped',
      });
      return;
    }

    // TODO: Remove Hedera trigger watchers for this pipeline

    // Update pipeline status
    pipeline.isActive = false;
    pipeline.status = 'stopped';
    pipeline.lastDeactivatedAt = new Date();
    pipeline.errorMessage = undefined;
    await pipeline.save();

    console.log(`Pipeline deactivated: ${pipeline.name} (${pipeline._id})`);

    res.status(200).json({
      success: true,
      data: {
        pipelineId: pipeline._id,
        status: pipeline.status,
        isActive: pipeline.isActive,
        lastDeactivatedAt: pipeline.lastDeactivatedAt,
      },
      message: 'Pipeline deactivated successfully',
    });
  } catch (error: any) {
    console.error('Error deactivating pipeline:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to deactivate pipeline',
    });
  }
};

/**
 * Get pipeline status
 * @route GET /api/pipelines/:pipelineId/status
 */
export const getPipelineStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pipelineId } = req.params;
    const userId = req.user?._id;

    const pipeline = await Pipeline.findOne({ _id: pipelineId, userId });

    if (!pipeline) {
      res.status(404).json({
        success: false,
        message: 'Pipeline not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        pipelineId: pipeline._id,
        name: pipeline.name,
        status: pipeline.status,
        isActive: pipeline.isActive,
        lastActivatedAt: pipeline.lastActivatedAt,
        lastDeactivatedAt: pipeline.lastDeactivatedAt,
        lastExecutedAt: pipeline.lastExecutedAt,
        executionCount: pipeline.executionCount,
        errorMessage: pipeline.errorMessage,
      },
    });
  } catch (error: any) {
    console.error('Error fetching pipeline status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch pipeline status',
    });
  }
};
