/**
 * Central LLM Service — AWS Bedrock (GPT-OSS models via Bearer Token)
 *
 * This is the ONLY file that communicates with Bedrock.
 * Everything else (copilot, AI handler, etc.) imports from here.
 *
 * Uses the Converse API for standard calls and the OpenAI-compatible
 * SSE endpoint for streaming.
 */

import axios from 'axios';

export const MODELS = {
  GPT_OSS_120B: 'openai.gpt-oss-120b-1:0',
  GPT_OSS_20B: 'openai.gpt-oss-20b-1:0',
} as const;

class LLMService {
  private get region(): string {
    return process.env.AWS_BEDROCK_REGION || 'us-east-1';
  }

  private get bearerToken(): string {
    return process.env.AWS_BEARER_TOKEN_BEDROCK || '';
  }

  private get defaultModel(): string {
    return process.env.BEDROCK_MODEL_ID || MODELS.GPT_OSS_120B;
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${this.bearerToken}`,
    };
  }

  private converseUrl(model?: string): string {
    const modelId = model || this.defaultModel;
    return `https://bedrock-runtime.${this.region}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`;
  }

  private get streamUrl(): string {
    return `https://bedrock-runtime.${this.region}.amazonaws.com/openai/v1/chat/completions`;
  }

  /**
   * Standard chat via Bedrock Converse API.
   */
  async chat(params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{
    content: string;
    usage?: { inputTokens: number; outputTokens: number };
  }> {
    if (!this.bearerToken) {
      throw new Error(
        'AWS_BEARER_TOKEN_BEDROCK is not configured. Set it in backend .env.',
      );
    }

    const converseMessages = params.messages.map((m) => ({
      role: m.role,
      content: [{ text: m.content }],
    }));

    const body: any = {
      messages: converseMessages,
      inferenceConfig: {
        maxTokens: params.maxTokens ?? 2048,
        temperature: params.temperature ?? 0.3,
      },
    };

    if (params.systemPrompt) {
      body.system = [{ text: params.systemPrompt }];
    }

    const response = await axios.post(this.converseUrl(params.model), body, {
      headers: this.headers,
      timeout: 120_000,
    });

    const output = response.data;
    const content = output.output?.message?.content?.[0]?.text || '';

    return {
      content,
      usage: output.usage
        ? {
            inputTokens: output.usage.inputTokens,
            outputTokens: output.usage.outputTokens,
          }
        : undefined,
    };
  }

  /**
   * Structured JSON output — calls chat then parses JSON from the response.
   */
  async structuredChat<T>(params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<T> {
    const jsonInstruction =
      '\n\nYou MUST respond with valid JSON only. No markdown, no backticks, no text before or after the JSON object.';

    const result = await this.chat({
      ...params,
      systemPrompt: (params.systemPrompt || '') + jsonInstruction,
    });

    const cleaned = result.content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned) as T;
  }

  /**
   * Streaming via the OpenAI-compatible SSE endpoint.
   * Yields content delta strings as they arrive.
   */
  async *chatStream(params: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): AsyncGenerator<string> {
    if (!this.bearerToken) {
      throw new Error(
        'AWS_BEARER_TOKEN_BEDROCK is not configured. Set it in backend .env.',
      );
    }

    const response = await axios.post(
      this.streamUrl,
      {
        model: params.model || this.defaultModel,
        messages: params.messages,
        temperature: params.temperature ?? 0.3,
        max_completion_tokens: params.maxTokens ?? 2048,
        stream: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.bearerToken}`,
        },
        responseType: 'stream',
        timeout: 120_000,
      },
    );

    let buffer = '';

    for await (const chunk of response.data) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') return;

        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const delta = data.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // Skip malformed chunks
          }
        }
      }
    }
  }
}

export const llmService = new LLMService();
