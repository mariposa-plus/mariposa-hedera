import { Response } from 'express';
import Pipeline from '../models/Pipeline';
import { AuthRequest } from '../middleware/auth';
import { hederaProjectManager } from '../services/hederaProjectManager.service';

// @desc    Get all pipelines for user
// @route   GET /api/pipelines
// @access  Private
export const getPipelines = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const pipelines = await Pipeline.find({ userId: req.user?._id })
      .select(
        'name description isActive lastExecutedAt executionCount createdAt updatedAt'
      )
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: pipelines,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Create new pipeline
// @route   POST /api/pipelines
// @access  Private
export const createPipeline = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, description } = req.body;

    const pipelineName = name || 'Untitled Pipeline';

    const pipeline = await Pipeline.create({
      userId: req.user?._id,
      name: pipelineName,
      description,
      nodes: [],
      edges: [],
    });

    // Auto-create Hedera project for this pipeline
    try {
      const hederaProject = await hederaProjectManager.createProject(
        req.user?._id?.toString() || '',
        pipelineName,
        description
      );
      pipeline.hederaProjectId = hederaProject._id;
      await pipeline.save();
    } catch (hederaError: any) {
      console.warn('Hedera project auto-creation failed:', hederaError.message);
    }

    res.status(201).json({
      success: true,
      data: pipeline,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get single pipeline
// @route   GET /api/pipelines/:id
// @access  Private
export const getPipeline = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const pipeline = await Pipeline.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });

    if (!pipeline) {
      res.status(404).json({
        success: false,
        message: 'Pipeline not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: pipeline,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Update pipeline
// @route   PUT /api/pipelines/:id
// @access  Private
export const updatePipeline = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    let { name, description, nodes, edges, isActive } = req.body;

    // DEBUG: Log what we received
    console.log('=== UPDATE PIPELINE DEBUG ===');
    console.log('Request body type:', typeof req.body);
    console.log('Nodes type:', typeof nodes);
    console.log('Nodes value:', nodes);
    console.log('Edges type:', typeof edges);
    console.log('Edges value:', edges);

    // Build update object with only provided fields
    const updateData: any = { updatedAt: new Date() };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Validate and add nodes if provided
    if (nodes !== undefined) {
      // Handle if nodes comes as a string (edge case protection)
      if (typeof nodes === 'string') {
        console.log('Nodes is a string, attempting to parse...');
        try {
          nodes = JSON.parse(nodes);
          console.log('Successfully parsed nodes (first pass):', Array.isArray(nodes) ? `Array with ${nodes.length} items` : typeof nodes);

          // Check if still a string after first parse (double-stringified)
          if (typeof nodes === 'string') {
            console.log('Nodes still a string after first parse, parsing again...');
            nodes = JSON.parse(nodes);
            console.log('Successfully parsed nodes (second pass):', Array.isArray(nodes) ? `Array with ${nodes.length} items` : typeof nodes);
          }
        } catch (e) {
          console.error('Failed to parse nodes:', e);
          res.status(400).json({
            success: false,
            message: `Invalid nodes format - failed to parse JSON string. Received: ${typeof nodes}`,
          });
          return;
        }
      }

      if (!Array.isArray(nodes)) {
        console.error('Nodes is not an array:', typeof nodes);
        res.status(400).json({
          success: false,
          message: `Nodes must be an array, received ${typeof nodes}. Value: ${JSON.stringify(nodes).substring(0, 100)}`,
        });
        return;
      }
      updateData.nodes = nodes;
    }

    // Validate and add edges if provided
    if (edges !== undefined) {
      // Handle if edges comes as a string (edge case protection)
      if (typeof edges === 'string') {
        try {
          edges = JSON.parse(edges);
        } catch (e) {
          res.status(400).json({
            success: false,
            message: 'Invalid edges format - failed to parse JSON string',
          });
          return;
        }
      }

      if (!Array.isArray(edges)) {
        res.status(400).json({
          success: false,
          message: 'Edges must be an array',
        });
        return;
      }
      updateData.edges = edges;
    }

    const pipeline = await Pipeline.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!pipeline) {
      res.status(404).json({
        success: false,
        message: 'Pipeline not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: pipeline,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Delete pipeline
// @route   DELETE /api/pipelines/:id
// @access  Private
export const deletePipeline = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Find pipeline first to get hederaProjectId for cascade delete
    const pipeline = await Pipeline.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });

    if (!pipeline) {
      res.status(404).json({
        success: false,
        message: 'Pipeline not found',
      });
      return;
    }

    // Cascade delete Hedera project if it exists
    if (pipeline.hederaProjectId) {
      try {
        await hederaProjectManager.deleteProject(
          pipeline.hederaProjectId.toString(),
          req.user?._id?.toString() || ''
        );
      } catch (hederaError: any) {
        console.warn('Hedera project cleanup failed:', hederaError.message);
      }
    }

    await Pipeline.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Pipeline deleted',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Duplicate pipeline
// @route   POST /api/pipelines/:id/duplicate
// @access  Private
export const duplicatePipeline = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const original = await Pipeline.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });

    if (!original) {
      res.status(404).json({
        success: false,
        message: 'Pipeline not found',
      });
      return;
    }

    const dupName = `${original.name} (Copy)`;
    const duplicate = await Pipeline.create({
      userId: req.user?._id,
      name: dupName,
      description: original.description,
      nodes: original.nodes,
      edges: original.edges,
    });

    // Auto-create Hedera project for the duplicate
    try {
      const hederaProject = await hederaProjectManager.createProject(
        req.user?._id?.toString() || '',
        dupName,
        original.description
      );
      duplicate.hederaProjectId = hederaProject._id;
      await duplicate.save();
    } catch (hederaError: any) {
      console.warn('Hedera project auto-creation for duplicate failed:', hederaError.message);
    }

    res.status(201).json({
      success: true,
      data: duplicate,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};
