/**
 * Copilot Service — AWS Bedrock (via central LLM service)
 *
 * Sends chat messages (with canvas context) to Bedrock and parses the
 * response into a conversational message + optional canvas actions.
 */

import { llmService, MODELS } from './llm';
import { buildCopilotPrompt, CopilotAction } from './copilot.prompt';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CopilotResponse {
  message: string;
  actions: CopilotAction[];
}

class CopilotService {
  /**
   * Send a chat conversation to Bedrock with the current canvas context.
   */
  async chat(
    messages: ChatMessage[],
    currentNodes: any[],
    currentEdges: any[],
  ): Promise<CopilotResponse> {
    // Build system prompt with current canvas state
    const systemPrompt = buildCopilotPrompt(currentNodes, currentEdges);

    // Only user/assistant messages go in the messages array for Converse API
    const conversationMessages = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    let result;
    try {
      result = await llmService.chat({
        systemPrompt,
        messages: conversationMessages,
        model: MODELS.GPT_OSS_120B,
        temperature: 0.7,
        maxTokens: 4096,
      });
    } catch (error: any) {
      console.error('[Copilot] Bedrock error:', error.message);
      throw new Error(`Bedrock request failed: ${error.message}`);
    }

    return this.parseResponse(result.content);
  }

  /**
   * Parse the LLM response into a message + actions.
   *
   * The LLM is instructed to put canvas mutations inside a
   *   ```actions
   *   [ ... ]
   *   ```
   * code block at the end. Everything before it is the conversational reply.
   */
  private parseResponse(raw: string): CopilotResponse {
    // Try to extract ```actions ... ``` block
    const actionsRegex = /```actions\s*\n([\s\S]*?)```/;
    const match = raw.match(actionsRegex);

    let message = raw;
    let actions: CopilotAction[] = [];

    if (match) {
      // Everything before the actions block is the message
      message = raw.slice(0, match.index).trim();
      try {
        actions = JSON.parse(match[1].trim());
        if (!Array.isArray(actions)) {
          actions = [];
        }
      } catch {
        // If JSON parse fails, treat as no actions
        console.warn('[Copilot] Failed to parse actions JSON:', match[1]);
        actions = [];
      }
    }

    return { message, actions };
  }
}

export const copilotService = new CopilotService();
