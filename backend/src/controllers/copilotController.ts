import { Request, Response } from 'express';
import { copilotService } from '../services/copilot.service';

/**
 * POST /api/copilot/chat
 *
 * Body: { messages: ChatMessage[], nodes: any[], edges: any[] }
 * Returns: { success, message, actions }
 */
export const chat = async (req: Request, res: Response) => {
  try {
    const { messages, nodes, edges } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'messages array is required and must not be empty',
      });
    }

    const result = await copilotService.chat(
      messages,
      nodes || [],
      edges || [],
    );

    res.json({
      success: true,
      message: result.message,
      actions: result.actions,
    });
  } catch (error: any) {
    console.error('[Copilot] Chat error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Copilot request failed',
    });
  }
};
