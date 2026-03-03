/**
 * Copilot Service — Together AI (OpenAI-compatible API)
 *
 * Sends chat messages (with canvas context) to Together AI and parses the
 * response into a conversational message + optional canvas actions.
 */

import axios from 'axios';
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
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api.together.xyz/v1/chat/completions';

  constructor() {
    this.apiKey = process.env.TOGETHER_API_KEY || '';
    this.model =
      process.env.TOGETHER_MODEL ||
      'Qwen/Qwen3-235B-A22B-Instruct-2507-tput';
  }

  /**
   * Send a chat conversation to Together AI with the current canvas context.
   */
  async chat(
    messages: ChatMessage[],
    currentNodes: any[],
    currentEdges: any[],
  ): Promise<CopilotResponse> {
    if (!this.apiKey) {
      throw new Error(
        'TOGETHER_API_KEY is not configured. Please set it in the backend .env file.',
      );
    }

    // Build system prompt with current canvas state
    const systemPrompt = buildCopilotPrompt(currentNodes, currentEdges);

    // Construct the messages array: system + conversation history
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    let response;
    try {
      response = await axios.post(
        this.baseUrl,
        {
          model: this.model,
          messages: fullMessages,
          max_tokens: 4096,
          temperature: 0.7,
          top_p: 0.9,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        },
      );
    } catch (error: any) {
      const detail = error.response?.data?.error?.message
        || JSON.stringify(error.response?.data)
        || error.message;
      console.error('[Copilot] Together AI error:', detail);
      throw new Error(`Together AI request failed: ${detail}`);
    }

    const rawContent: string =
      response.data?.choices?.[0]?.message?.content || '';

    return this.parseResponse(rawContent);
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
