import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { getBedrockClient } from '../aws';
import { SentryUtils, LLMError } from '../monitoring/sentry-utils';

// Model configuration types
export interface ModelConfig {
  id: string;
  name: string;
  tier: 'fast' | 'balanced' | 'premium';
  inputCostPer1K: number;
  outputCostPer1K: number;
  maxTokens: number;
  supportsThai: boolean;
  description: string;
}

export interface BedrockRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  chatbotId?: string;
  sessionId?: string;
}

export interface BedrockResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  model: string;
  responseTime: number;
  metadata?: Record<string, any>;
}

export interface EmbeddingRequest {
  text: string;
  model?: string;
  dimensions?: number;
  normalize?: boolean;
  chatbotId?: string;
  sessionId?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  inputTokens: number;
  cost: number;
  model: string;
  responseTime: number;
  dimensions: number;
}

export interface ComplexityAnalysis {
  score: number; // 0-100
  suggestedTier: 'fast' | 'balanced' | 'premium';
  factors: {
    length: number;
    complexity: number;
    thaiContent: boolean;
    technicalTerms: number;
    questionType: 'simple' | 'complex' | 'analytical';
  };
}

export interface UsageStats {
  chatbotId: string;
  period: string;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
  averageResponseTime: number;
  modelBreakdown: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
    averageResponseTime: number;
  }>;
}

// Available models configuration
export const BEDROCK_MODELS: Record<string, ModelConfig> = {
  'anthropic.claude-3-haiku-20240307-v1:0': {
    id: 'anthropic.claude-3-haiku-20240307-v1:0',
    name: 'Claude 3 Haiku',
    tier: 'fast',
    inputCostPer1K: 0.00025,
    outputCostPer1K: 0.00125,
    maxTokens: 200000,
    supportsThai: true,
    description: 'Fast, cost-effective model for simple queries and quick responses'
  },
  'anthropic.claude-3-sonnet-20240229-v1:0': {
    id: 'anthropic.claude-3-sonnet-20240229-v1:0',
    name: 'Claude 3 Sonnet',
    tier: 'balanced',
    inputCostPer1K: 0.003,
    outputCostPer1K: 0.015,
    maxTokens: 200000,
    supportsThai: true,
    description: 'Balanced performance and cost for most use cases'
  },
  'amazon.titan-premier-v1:0': {
    id: 'amazon.titan-premier-v1:0',
    name: 'Amazon Titan Premier',
    tier: 'premium',
    inputCostPer1K: 0.0005,
    outputCostPer1K: 0.0015,
    maxTokens: 32000,
    supportsThai: true,
    description: 'High-performance model for complex reasoning and analysis'
  },
  'amazon.titan-embed-text-v2:0': {
    id: 'amazon.titan-embed-text-v2:0',
    name: 'Titan Text Embeddings V2',
    tier: 'fast',
    inputCostPer1K: 0.0001,
    outputCostPer1K: 0,
    maxTokens: 8192,
    supportsThai: true,
    description: 'High-quality text embeddings for vector search'
  }
};

export class BedrockService {
  private client: BedrockRuntimeClient;
  private usageTracker: Map<string, any[]> = new Map();

  constructor() {
    this.client = getBedrockClient();
  }

  /**
   * Analyze query complexity to determine appropriate model tier
   */
  public analyzeComplexity(query: string): ComplexityAnalysis {
    const words = query.trim().split(/\s+/);
    const length = words.length;

    // Detect Thai content
    const thaiRegex = /[\u0E00-\u0E7F]/;
    const thaiContent = thaiRegex.test(query);

    // Technical terms detection (simplified)
    const technicalTerms = (query.match(/\b(API|database|server|authentication|configuration|implementation|algorithm|optimization)\b/gi) || []).length;

    // Question complexity analysis
    let questionType: 'simple' | 'complex' | 'analytical' = 'simple';
    if (query.includes('why') || query.includes('how') || query.includes('explain') || query.includes('analyze')) {
      questionType = 'complex';
    }
    if (query.includes('compare') || query.includes('evaluate') || query.includes('strategy') || query.includes('recommend')) {
      questionType = 'analytical';
    }

    // Calculate complexity score
    let score = 0;
    score += Math.min(length * 2, 30); // Length factor (max 30)
    score += technicalTerms * 10; // Technical terms (10 points each)
    score += thaiContent ? 15 : 0; // Thai content bonus
    score += questionType === 'simple' ? 0 : questionType === 'complex' ? 20 : 35; // Question type

    // Determine suggested tier
    let suggestedTier: 'fast' | 'balanced' | 'premium';
    if (score < 30) {
      suggestedTier = 'fast';
    } else if (score < 60) {
      suggestedTier = 'balanced';
    } else {
      suggestedTier = 'premium';
    }

    return {
      score: Math.min(score, 100),
      suggestedTier,
      factors: {
        length,
        complexity: score,
        thaiContent,
        technicalTerms,
        questionType
      }
    };
  }

  /**
   * Select optimal model based on complexity analysis and preferences
   */
  public selectModel(
    complexity: ComplexityAnalysis,
    preferences?: {
      preferredTier?: 'fast' | 'balanced' | 'premium';
      maxCost?: number;
      requiresThai?: boolean;
    }
  ): ModelConfig {
    const availableModels = Object.values(BEDROCK_MODELS).filter(model =>
      model.id !== 'amazon.titan-embed-text-v2:0' // Exclude embedding model
    );

    // Filter by Thai support if required
    const filteredModels = preferences?.requiresThai
      ? availableModels.filter(model => model.supportsThai)
      : availableModels;

    // Filter by cost if specified
    const costFilteredModels = preferences?.maxCost
      ? filteredModels.filter(model => model.outputCostPer1K <= preferences.maxCost!)
      : filteredModels;

    // Prefer user's tier preference, fallback to complexity suggestion
    const targetTier = preferences?.preferredTier || complexity.suggestedTier;

    // Find model matching target tier
    let selectedModel = costFilteredModels.find(model => model.tier === targetTier);

    // Fallback logic if no model found for target tier
    if (!selectedModel) {
      if (targetTier === 'premium') {
        selectedModel = costFilteredModels.find(model => model.tier === 'balanced') ||
                      costFilteredModels.find(model => model.tier === 'fast');
      } else if (targetTier === 'balanced') {
        selectedModel = costFilteredModels.find(model => model.tier === 'fast') ||
                      costFilteredModels.find(model => model.tier === 'premium');
      } else {
        selectedModel = costFilteredModels.find(model => model.tier === 'balanced') ||
                      costFilteredModels.find(model => model.tier === 'premium');
      }
    }

    // Ultimate fallback to first available model
    if (!selectedModel) {
      selectedModel = costFilteredModels[0] || availableModels[0];
    }

    return selectedModel;
  }

  /**
   * Generate text embeddings using Titan
   */
  public async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    const modelId = request.model || 'amazon.titan-embed-text-v2:0';
    const model = BEDROCK_MODELS[modelId];

    if (!model) {
      throw new LLMError(`Unknown embedding model: ${modelId}`);
    }

    try {
      const input = {
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          inputText: request.text,
          dimensions: request.dimensions || 512,
          normalize: request.normalize !== false
        })
      };

      const command = new InvokeModelCommand(input);
      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      const responseTime = Date.now() - startTime;
      const inputTokens = Math.ceil(request.text.length / 4); // Approximate token count
      const cost = (inputTokens / 1000) * model.inputCostPer1K;

      const result: EmbeddingResponse = {
        embedding: responseBody.embedding,
        inputTokens,
        cost,
        model: modelId,
        responseTime,
        dimensions: responseBody.embedding.length
      };

      // Track usage
      this.trackUsage(request.chatbotId || 'unknown', {
        type: 'embedding',
        model: modelId,
        inputTokens,
        outputTokens: 0,
        cost,
        responseTime,
        timestamp: new Date().toISOString()
      });

      // Sentry monitoring
      if (request.chatbotId && request.sessionId) {
        SentryUtils.captureLLMInteraction({
          chatbotId: request.chatbotId,
          sessionId: request.sessionId,
          model: modelId,
          inputTokens,
          outputTokens: 0,
          responseTime,
          success: true
        });
      }

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Sentry error tracking
      if (request.chatbotId && request.sessionId) {
        SentryUtils.captureLLMInteraction({
          chatbotId: request.chatbotId,
          sessionId: request.sessionId,
          model: modelId,
          inputTokens: 0,
          outputTokens: 0,
          responseTime,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      throw new LLMError(
        `Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { model: modelId, textLength: request.text.length }
      );
    }
  }

  /**
   * Generate text response with automatic model selection
   */
  public async generateResponse(request: BedrockRequest): Promise<BedrockResponse> {
    const startTime = Date.now();

    // Analyze complexity and select model if not specified
    let selectedModel: ModelConfig;
    if (request.model) {
      selectedModel = BEDROCK_MODELS[request.model];
      if (!selectedModel) {
        throw new LLMError(`Unknown model: ${request.model}`);
      }
    } else {
      const complexity = this.analyzeComplexity(request.prompt);
      selectedModel = this.selectModel(complexity, {
        requiresThai: /[\u0E00-\u0E7F]/.test(request.prompt)
      });
    }

    try {
      let input: any;

      // Model-specific request formatting
      if (selectedModel.id.startsWith('anthropic.claude')) {
        input = {
          modelId: selectedModel.id,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: request.maxTokens || 4096,
            temperature: request.temperature || 0.7,
            top_p: request.topP || 0.9,
            stop_sequences: request.stopSequences || [],
            messages: [
              {
                role: 'user',
                content: request.prompt
              }
            ]
          })
        };
      } else if (selectedModel.id.startsWith('amazon.titan')) {
        input = {
          modelId: selectedModel.id,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            inputText: request.prompt,
            textGenerationConfig: {
              maxTokenCount: request.maxTokens || 4096,
              temperature: request.temperature || 0.7,
              topP: request.topP || 0.9,
              stopSequences: request.stopSequences || []
            }
          })
        };
      } else {
        throw new LLMError(`Unsupported model format: ${selectedModel.id}`);
      }

      const command = new InvokeModelCommand(input);
      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      const responseTime = Date.now() - startTime;

      // Extract response text based on model type
      let responseText: string;
      let inputTokens: number;
      let outputTokens: number;

      if (selectedModel.id.startsWith('anthropic.claude')) {
        responseText = responseBody.content[0].text;
        inputTokens = responseBody.usage.input_tokens;
        outputTokens = responseBody.usage.output_tokens;
      } else if (selectedModel.id.startsWith('amazon.titan')) {
        responseText = responseBody.results[0].outputText;
        inputTokens = responseBody.inputTextTokenCount || Math.ceil(request.prompt.length / 4);
        outputTokens = responseBody.results[0].tokenCount || Math.ceil(responseText.length / 4);
      } else {
        throw new LLMError(`Cannot parse response from model: ${selectedModel.id}`);
      }

      const totalTokens = inputTokens + outputTokens;
      const cost = (inputTokens / 1000) * selectedModel.inputCostPer1K +
                   (outputTokens / 1000) * selectedModel.outputCostPer1K;

      const result: BedrockResponse = {
        text: responseText,
        inputTokens,
        outputTokens,
        totalTokens,
        cost,
        model: selectedModel.id,
        responseTime,
        metadata: {
          modelName: selectedModel.name,
          tier: selectedModel.tier,
          temperature: request.temperature || 0.7,
          topP: request.topP || 0.9
        }
      };

      // Track usage
      this.trackUsage(request.chatbotId || 'unknown', {
        type: 'generation',
        model: selectedModel.id,
        inputTokens,
        outputTokens,
        cost,
        responseTime,
        timestamp: new Date().toISOString()
      });

      // Sentry monitoring
      if (request.chatbotId && request.sessionId) {
        SentryUtils.captureLLMInteraction({
          chatbotId: request.chatbotId,
          sessionId: request.sessionId,
          model: selectedModel.id,
          inputTokens,
          outputTokens,
          responseTime,
          success: true
        });
      }

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Sentry error tracking
      if (request.chatbotId && request.sessionId) {
        SentryUtils.captureLLMInteraction({
          chatbotId: request.chatbotId,
          sessionId: request.sessionId,
          model: selectedModel.id,
          inputTokens: 0,
          outputTokens: 0,
          responseTime,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      throw new LLMError(
        `Text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          model: selectedModel.id,
          promptLength: request.prompt.length,
          responseTime
        }
      );
    }
  }

  /**
   * Get current model costs and availability
   */
  public getModelCosts(): Record<string, ModelConfig> {
    return { ...BEDROCK_MODELS };
  }

  /**
   * Optimize model usage based on chatbot patterns
   */
  public optimizeModelUsage(chatbotId: string): {
    currentUsage: UsageStats;
    recommendations: string[];
    potentialSavings: number;
  } {
    const usage = this.getUsageStats(chatbotId, '7d');
    const recommendations: string[] = [];
    let potentialSavings = 0;

    // Analyze usage patterns
    const modelUsage = Object.entries(usage.modelBreakdown);

    // Check for overuse of premium models
    const premiumUsage = modelUsage.filter(([modelId]) =>
      BEDROCK_MODELS[modelId]?.tier === 'premium'
    );

    if (premiumUsage.length > 0) {
      const totalPremiumCost = premiumUsage.reduce((sum, [, stats]) => sum + stats.cost, 0);
      const totalPremiumRequests = premiumUsage.reduce((sum, [, stats]) => sum + stats.requests, 0);

      if (totalPremiumCost > usage.totalCost * 0.6) {
        recommendations.push(
          `Consider using balanced tier models for ${Math.round(totalPremiumRequests * 0.3)} requests to reduce costs`
        );
        potentialSavings += totalPremiumCost * 0.3;
      }
    }

    // Check for slow response times
    if (usage.averageResponseTime > 5000) {
      recommendations.push(
        'Consider using faster tier models for improved user experience'
      );
    }

    // Check for high token usage
    const avgTokensPerRequest = usage.totalTokens / usage.requestCount;
    if (avgTokensPerRequest > 2000) {
      recommendations.push(
        'Consider optimizing prompts to reduce token usage and costs'
      );
    }

    return {
      currentUsage: usage,
      recommendations,
      potentialSavings
    };
  }

  /**
   * Get usage statistics for a chatbot
   */
  public getUsageStats(chatbotId: string, period: string = '7d'): UsageStats {
    const usageData = this.usageTracker.get(chatbotId) || [];

    // Filter by period (simplified - in production, use proper date handling)
    const periodMs = period === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                    period === '30d' ? 30 * 24 * 60 * 60 * 1000 :
                    24 * 60 * 60 * 1000; // Default to 1 day

    const cutoffDate = new Date(Date.now() - periodMs);
    const filteredData = usageData.filter(item =>
      new Date(item.timestamp) >= cutoffDate
    );

    const totalCost = filteredData.reduce((sum, item) => sum + item.cost, 0);
    const totalTokens = filteredData.reduce((sum, item) => sum + item.inputTokens + item.outputTokens, 0);
    const requestCount = filteredData.length;
    const averageResponseTime = filteredData.length > 0
      ? filteredData.reduce((sum, item) => sum + item.responseTime, 0) / filteredData.length
      : 0;

    // Group by model
    const modelBreakdown: Record<string, any> = {};
    filteredData.forEach(item => {
      if (!modelBreakdown[item.model]) {
        modelBreakdown[item.model] = {
          requests: 0,
          tokens: 0,
          cost: 0,
          responseTimes: []
        };
      }

      modelBreakdown[item.model].requests++;
      modelBreakdown[item.model].tokens += item.inputTokens + item.outputTokens;
      modelBreakdown[item.model].cost += item.cost;
      modelBreakdown[item.model].responseTimes.push(item.responseTime);
    });

    // Calculate averages
    Object.keys(modelBreakdown).forEach(model => {
      const times = modelBreakdown[model].responseTimes;
      modelBreakdown[model].averageResponseTime = times.length > 0
        ? times.reduce((sum: number, time: number) => sum + time, 0) / times.length
        : 0;
      delete modelBreakdown[model].responseTimes;
    });

    return {
      chatbotId,
      period,
      totalCost,
      totalTokens,
      requestCount,
      averageResponseTime,
      modelBreakdown
    };
  }

  /**
   * Test Bedrock connectivity and model availability
   */
  public async testConnection(): Promise<{
    success: boolean;
    message: string;
    availableModels: string[];
    errors: string[];
  }> {
    const availableModels: string[] = [];
    const errors: string[] = [];

    // Test embedding model
    try {
      await this.generateEmbedding({
        text: 'Test embedding for connectivity check'
      });
      availableModels.push('amazon.titan-embed-text-v2:0');
    } catch (error) {
      errors.push(`Embedding model test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test a fast tier model
    try {
      await this.generateResponse({
        prompt: 'Hello, this is a connectivity test. Please respond with "Connection successful".',
        model: 'anthropic.claude-3-haiku-20240307-v1:0'
      });
      availableModels.push('anthropic.claude-3-haiku-20240307-v1:0');
    } catch (error) {
      errors.push(`Haiku model test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const success = availableModels.length > 0;
    const message = success
      ? `Bedrock connection successful. ${availableModels.length} models available.`
      : 'Bedrock connection failed. No models available.';

    return {
      success,
      message,
      availableModels,
      errors
    };
  }

  /**
   * Track usage for analytics and optimization
   */
  private trackUsage(chatbotId: string, usage: any): void {
    if (!this.usageTracker.has(chatbotId)) {
      this.usageTracker.set(chatbotId, []);
    }

    const chatbotUsage = this.usageTracker.get(chatbotId)!;
    chatbotUsage.push(usage);

    // Keep only last 1000 entries per chatbot to prevent memory issues
    if (chatbotUsage.length > 1000) {
      chatbotUsage.splice(0, chatbotUsage.length - 1000);
    }
  }

  /**
   * Handle model fallback when primary model is unavailable
   */
  private async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackModel: string,
    fallbackOperation: () => Promise<T>
  ): Promise<T> {
    try {
      return await primaryOperation();
    } catch (error) {
      SentryUtils.addBreadcrumb(
        `Model fallback triggered due to error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { fallbackModel },
        'warning'
      );

      return await fallbackOperation();
    }
  }

  /**
   * Batch process multiple requests for efficiency
   */
  public async batchGenerateResponses(requests: BedrockRequest[]): Promise<BedrockResponse[]> {
    return Promise.all(
      requests.map(request => this.generateResponse(request))
    );
  }

  /**
   * Stream response for long-form content (future enhancement)
   */
  public async streamResponse(request: BedrockRequest): Promise<AsyncGenerator<string, void, unknown>> {
    // This is a placeholder for streaming implementation
    // AWS Bedrock supports streaming, but requires different SDK methods
    throw new Error('Streaming responses not yet implemented');
  }
}

// Singleton instance
let bedrockService: BedrockService | null = null;

export function getBedrockService(): BedrockService {
  if (!bedrockService) {
    bedrockService = new BedrockService();
  }
  return bedrockService;
}

export default BedrockService;