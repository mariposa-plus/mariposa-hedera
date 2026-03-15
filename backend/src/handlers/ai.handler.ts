import { llmService, MODELS } from '../services/llm';

export class AiHandler {
  async execute(node: any, execution: any, inputs: Record<string, any>): Promise<any> {
    const config = node.data?.fullConfig?.component || node.data?.config || {};
    const model = config.model || MODELS.GPT_OSS_120B;

    try {
      switch (node.type) {
        case 'llm-analyzer':
          return await this.handleLlmAnalyzer(config, inputs, model);

        case 'risk-scorer':
          return await this.handleRiskScorer(config, inputs, model);

        case 'sentiment-analyzer':
          return await this.handleSentimentAnalyzer(config, inputs, model);

        default:
          return { success: true, nodeType: node.type, message: 'Handler not implemented' };
      }
    } catch (error: any) {
      console.error(`[AI Handler] ${node.type} error:`, error.message);
      return { success: false, error: error.message };
    }
  }

  private async handleLlmAnalyzer(
    config: any,
    inputs: Record<string, any>,
    model: string,
  ) {
    const systemPrompt = config.systemPrompt || 'You are a helpful AI assistant.';
    const userPrompt = (config.userPrompt || inputs.prompt || 'Analyze the provided data.')
      .replace(/\{\{data\}\}/g, JSON.stringify(inputs.data || {}));

    const outputFormat = config.outputFormat || 'text';

    if (outputFormat === 'json') {
      const structured = await llmService.structuredChat<any>({
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        model,
      });
      return {
        success: true,
        response: JSON.stringify(structured),
        structured,
        decision: null,
        model,
      };
    }

    if (outputFormat === 'boolean') {
      const result = await llmService.chat({
        systemPrompt: systemPrompt + '\n\nRespond with ONLY "yes" or "no". Nothing else.',
        messages: [{ role: 'user', content: userPrompt }],
        model,
      });
      const answer = result.content.toLowerCase().trim();
      return {
        success: true,
        response: result.content,
        structured: null,
        decision: answer.startsWith('yes') ? 'proceed' : 'hold',
        model,
        tokensUsed: result.usage
          ? result.usage.inputTokens + result.usage.outputTokens
          : undefined,
      };
    }

    // Default: free text
    const result = await llmService.chat({
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      model,
    });
    return {
      success: true,
      response: result.content,
      structured: null,
      decision: null,
      model,
      tokensUsed: result.usage
        ? result.usage.inputTokens + result.usage.outputTokens
        : undefined,
    };
  }

  private async handleRiskScorer(
    config: any,
    inputs: Record<string, any>,
    model: string,
  ) {
    const factors = config.factors || [
      'volatility',
      'impermanent_loss',
      'liquidity_depth',
      'smart_contract_risk',
    ];

    const systemPrompt = `You are a DeFi risk analysis expert for the Hedera ecosystem.
Analyze the provided portfolio and market data. Evaluate these risk factors: ${factors.map((f: string) => `"${f}"`).join(', ')}.

Return JSON:
{
  "riskScore": <number 0-100>,
  "analysis": "<2-3 sentence risk analysis>",
  "recommendation": "<hold|rebalance|exit|increase_position>",
  "factors": { <each factor with score 0-100> }
}`;

    const userPrompt = `Portfolio: ${JSON.stringify(inputs.portfolioData || {})}
Market: ${JSON.stringify(inputs.marketData || {})}`;

    const parsed = await llmService.structuredChat<{
      riskScore: number;
      analysis: string;
      recommendation: string;
      factors: Record<string, number>;
    }>({
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      model,
    });

    const riskScore = parsed.riskScore ?? 50;
    return {
      success: true,
      riskScore,
      analysis: JSON.stringify(parsed.factors || {}),
      recommendation: parsed.recommendation || 'hold',
      riskLevel: riskScore > 70 ? 'high' : riskScore > 40 ? 'moderate' : 'low',
    };
  }

  private async handleSentimentAnalyzer(
    config: any,
    inputs: Record<string, any>,
    model: string,
  ) {
    const systemPrompt = `You are a crypto market sentiment analyst.
Analyze the provided data and determine market sentiment.

Return JSON:
{
  "score": <number -100 to +100>,
  "label": "<very_bearish|bearish|neutral|bullish|very_bullish>",
  "summary": "<one sentence>",
  "keySignals": ["<signal 1>", "<signal 2>", "<signal 3>"]
}`;

    const userPrompt = `Analyze:\n${JSON.stringify(inputs.feedData || {})}`;

    const parsed = await llmService.structuredChat<{
      score: number;
      label: string;
      summary: string;
      keySignals: string[];
    }>({
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      model,
    });

    const score = parsed.score ?? 0;
    return {
      success: true,
      sentimentScore: score / 100, // normalize to -1..1 range for backward compat
      summary: parsed.summary || '',
      signals: JSON.stringify({
        label: parsed.label,
        keySignals: parsed.keySignals || [],
        sources: config.sources || ['twitter', 'reddit', 'news'],
      }),
      sentiment: score > 30 ? 'bullish' : score < -30 ? 'bearish' : 'neutral',
    };
  }
}

export const aiHandler = new AiHandler();
