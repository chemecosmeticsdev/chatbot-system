import { z } from 'zod';

/**
 * Chatbot Instance Database Schema
 * Multi-instance chatbot management with LLM configuration and knowledge scoping
 */

// Database interface for chatbot_instances table
export interface IChatbotInstance {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'inactive' | 'archived';
  llm_provider: 'bedrock' | 'openai' | 'anthropic';
  llm_model: string;
  system_prompt: string;
  model_config: Record<string, any>;
  rag_enabled: boolean;
  retrieval_k: number;
  score_threshold: number;
  context_window: number;
  welcome_message?: string;
  fallback_message?: string;
  performance_metrics: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  created_by?: string; // Stack Auth user ID
}

export type ChatbotStatus = 'draft' | 'active' | 'inactive' | 'archived';
export type LLMProvider = 'bedrock' | 'openai' | 'anthropic';

// Input interface for creating chatbot instances
export interface ICreateChatbotInstance {
  name: string;
  description?: string;
  status?: ChatbotStatus;
  llm_provider: LLMProvider;
  llm_model: string;
  system_prompt: string;
  model_config?: Record<string, any>;
  rag_enabled?: boolean;
  retrieval_k?: number;
  score_threshold?: number;
  context_window?: number;
  welcome_message?: string;
  fallback_message?: string;
}

// Input interface for updating chatbot instances
export interface IUpdateChatbotInstance {
  name?: string;
  description?: string;
  status?: ChatbotStatus;
  llm_model?: string;
  system_prompt?: string;
  model_config?: Record<string, any>;
  rag_enabled?: boolean;
  retrieval_k?: number;
  score_threshold?: number;
  context_window?: number;
  welcome_message?: string;
  fallback_message?: string;
  performance_metrics?: Record<string, any>;
}

// Zod schemas for validation
export const ChatbotInstanceSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'inactive', 'archived']).optional(),
  llm_provider: z.enum(['bedrock', 'openai', 'anthropic']),
  llm_model: z.string().min(1),
  system_prompt: z.string().min(10).max(8000),
  model_config: z.record(z.any()).optional(),
  rag_enabled: z.boolean().optional(),
  retrieval_k: z.number().int().min(1).max(20).optional(),
  score_threshold: z.number().min(0).max(1).optional(),
  context_window: z.number().int().min(1000).max(32000).optional(),
  welcome_message: z.string().max(1000).optional(),
  fallback_message: z.string().max(1000).optional(),
  performance_metrics: z.record(z.any()).optional(),
  created_at: z.date(),
  updated_at: z.date(),
  created_by: z.string().optional()
});

export const CreateChatbotInstanceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'inactive', 'archived']).optional(),
  llm_provider: z.enum(['bedrock', 'openai', 'anthropic']),
  llm_model: z.string().min(1),
  system_prompt: z.string().min(10).max(8000),
  model_config: z.record(z.any()).optional(),
  rag_enabled: z.boolean().optional(),
  retrieval_k: z.number().int().min(1).max(20).optional(),
  score_threshold: z.number().min(0).max(1).optional(),
  context_window: z.number().int().min(1000).max(32000).optional(),
  welcome_message: z.string().max(1000).optional(),
  fallback_message: z.string().max(1000).optional()
});

export const UpdateChatbotInstanceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'inactive', 'archived']).optional(),
  llm_model: z.string().min(1).optional(),
  system_prompt: z.string().min(10).max(8000).optional(),
  model_config: z.record(z.any()).optional(),
  rag_enabled: z.boolean().optional(),
  retrieval_k: z.number().int().min(1).max(20).optional(),
  score_threshold: z.number().min(0).max(1).optional(),
  context_window: z.number().int().min(1000).max(32000).optional(),
  welcome_message: z.string().max(1000).optional(),
  fallback_message: z.string().max(1000).optional(),
  performance_metrics: z.record(z.any()).optional()
});

// Type exports
export type ChatbotInstance = z.infer<typeof ChatbotInstanceSchema>;
export type CreateChatbotInstance = z.infer<typeof CreateChatbotInstanceSchema>;
export type UpdateChatbotInstance = z.infer<typeof UpdateChatbotInstanceSchema>;

// Chatbot model class with business logic
export class ChatbotInstanceModel {
  private data: IChatbotInstance;

  constructor(data: IChatbotInstance) {
    this.data = ChatbotInstanceSchema.parse({
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at)
    });
  }

  // Getters
  get id(): string {
    return this.data.id;
  }

  get organizationId(): string {
    return this.data.organization_id;
  }

  get name(): string {
    return this.data.name;
  }

  get description(): string | undefined {
    return this.data.description;
  }

  get status(): ChatbotStatus {
    return this.data.status;
  }

  get llmProvider(): LLMProvider {
    return this.data.llm_provider;
  }

  get llmModel(): string {
    return this.data.llm_model;
  }

  get systemPrompt(): string {
    return this.data.system_prompt;
  }

  get modelConfig(): Record<string, any> {
    return this.data.model_config;
  }

  get ragEnabled(): boolean {
    return this.data.rag_enabled;
  }

  get retrievalK(): number {
    return this.data.retrieval_k;
  }

  get scoreThreshold(): number {
    return this.data.score_threshold;
  }

  get contextWindow(): number {
    return this.data.context_window;
  }

  get welcomeMessage(): string | undefined {
    return this.data.welcome_message;
  }

  get fallbackMessage(): string | undefined {
    return this.data.fallback_message;
  }

  get performanceMetrics(): Record<string, any> {
    return this.data.performance_metrics;
  }

  get createdAt(): Date {
    return this.data.created_at;
  }

  get updatedAt(): Date {
    return this.data.updated_at;
  }

  get createdBy(): string | undefined {
    return this.data.created_by;
  }

  // Business logic methods
  isActive(): boolean {
    return this.data.status === 'active';
  }

  isDraft(): boolean {
    return this.data.status === 'draft';
  }

  isArchived(): boolean {
    return this.data.status === 'archived';
  }

  canBeActivated(): boolean {
    return this.data.status === 'draft' && this.hasRequiredConfiguration();
  }

  hasRequiredConfiguration(): boolean {
    return !!(
      this.data.name &&
      this.data.llm_model &&
      this.data.system_prompt &&
      this.data.system_prompt.length >= 10
    );
  }

  supportsRAG(): boolean {
    return this.data.rag_enabled;
  }

  getModelTemperature(): number {
    return this.data.model_config.temperature || 0.7;
  }

  getMaxTokens(): number {
    return this.data.model_config.max_tokens || 1000;
  }

  getTopP(): number {
    return this.data.model_config.top_p || 0.9;
  }

  getEstimatedCostPerMessage(): number {
    // Estimate based on model and average token usage
    const baseTokens = 500; // Average tokens per message
    const inputCost = this.getInputTokenCost(baseTokens);
    const outputCost = this.getOutputTokenCost(baseTokens);
    return inputCost + outputCost;
  }

  private getInputTokenCost(tokens: number): number {
    const costs = ChatbotInstanceModel.TOKEN_COSTS[this.data.llm_model];
    if (!costs) return 0;
    return (tokens / 1000) * costs.input;
  }

  private getOutputTokenCost(tokens: number): number {
    const costs = ChatbotInstanceModel.TOKEN_COSTS[this.data.llm_model];
    if (!costs) return 0;
    return (tokens / 1000) * costs.output;
  }

  getAverageResponseTime(): number {
    return this.data.performance_metrics.avg_response_time_ms || 0;
  }

  getTotalConversations(): number {
    return this.data.performance_metrics.total_conversations || 0;
  }

  getTotalMessages(): number {
    return this.data.performance_metrics.total_messages || 0;
  }

  getUserSatisfactionScore(): number {
    return this.data.performance_metrics.avg_user_satisfaction || 0;
  }

  getSuccessRate(): number {
    return this.data.performance_metrics.success_rate || 0;
  }

  updatePerformanceMetrics(metrics: Partial<Record<string, any>>): void {
    this.data.performance_metrics = {
      ...this.data.performance_metrics,
      ...metrics,
      last_updated: new Date()
    };
    this.data.updated_at = new Date();
  }

  // Validation methods
  static validateCreate(data: unknown): CreateChatbotInstance {
    return CreateChatbotInstanceSchema.parse(data);
  }

  static validateUpdate(data: unknown): UpdateChatbotInstance {
    return UpdateChatbotInstanceSchema.parse(data);
  }

  // Constants
  static readonly SUPPORTED_LLM_MODELS = {
    bedrock: [
      // Amazon Nova models (new default options)
      'amazon.nova-micro-v1:0',
      'amazon.nova-lite-v1:0',
      'amazon.nova-pro-v1:0',
      // Legacy Claude models (maintained for backward compatibility)
      'anthropic.claude-3-haiku-20240307-v1:0',
      'anthropic.claude-3-sonnet-20240229-v1:0',
      'anthropic.claude-3-opus-20240229-v1:0',
      'anthropic.claude-3-5-sonnet-20240620-v1:0',
      // Legacy Titan models
      'amazon.titan-text-lite-v1',
      'amazon.titan-text-express-v1'
    ],
    openai: [
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'gpt-4',
      'gpt-4-turbo',
      'gpt-4o'
    ],
    anthropic: [
      'claude-3-haiku-20240307',
      'claude-3-sonnet-20240229',
      'claude-3-opus-20240229',
      'claude-3-5-sonnet-20240620'
    ]
  };

  static readonly TOKEN_COSTS = {
    // Amazon Nova models (AWS Bedrock pricing per 1K tokens)
    'amazon.nova-micro-v1:0': { input: 0.000035, output: 0.00014 },    // Lowest cost tier
    'amazon.nova-lite-v1:0': { input: 0.0002, output: 0.0008 },        // Mid-tier pricing
    'amazon.nova-pro-v1:0': { input: 0.0008, output: 0.0032 },         // Premium pricing
    // Legacy AWS Bedrock models (maintained for backward compatibility)
    'anthropic.claude-3-haiku-20240307-v1:0': { input: 0.00025, output: 0.00125 },
    'anthropic.claude-3-sonnet-20240229-v1:0': { input: 0.003, output: 0.015 },
    'anthropic.claude-3-opus-20240229-v1:0': { input: 0.015, output: 0.075 },
    'anthropic.claude-3-5-sonnet-20240620-v1:0': { input: 0.003, output: 0.015 },
    'amazon.titan-text-lite-v1': { input: 0.0003, output: 0.0004 },
    'amazon.titan-text-express-v1': { input: 0.0008, output: 0.0016 },
    // OpenAI pricing
    'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4o': { input: 0.005, output: 0.015 }
  };

  static readonly DEFAULT_MODEL_CONFIGS = {
    // Amazon Nova models with optimized configurations
    'amazon.nova-micro-v1:0': {
      temperature: 0.3,        // Lower temperature for speed and consistency
      max_tokens: 500,         // Fewer tokens for cost efficiency
      top_p: 0.9
    },
    'amazon.nova-lite-v1:0': {
      temperature: 0.7,        // Balanced settings
      max_tokens: 1000,        // Standard token count
      top_p: 0.9
    },
    'amazon.nova-pro-v1:0': {
      temperature: 0.8,        // Higher capability settings
      max_tokens: 2000,        // More tokens for complex responses
      top_p: 0.9
    },
    // Legacy model configurations (maintained for backward compatibility)
    'anthropic.claude-3-haiku-20240307-v1:0': {
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 0.9
    },
    'anthropic.claude-3-sonnet-20240229-v1:0': {
      temperature: 0.7,
      max_tokens: 1500,
      top_p: 0.9
    },
    'amazon.titan-text-lite-v1': {
      temperature: 0.7,
      max_tokens: 800,
      top_p: 0.9
    },
    'amazon.titan-text-express-v1': {
      temperature: 0.7,
      max_tokens: 1200,
      top_p: 0.9
    },
    'gpt-3.5-turbo': {
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0
    },
    'gpt-4': {
      temperature: 0.7,
      max_tokens: 1500,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0
    }
  };

  static readonly STATUS_TRANSITIONS = {
    draft: ['active', 'archived'],
    active: ['inactive', 'archived'],
    inactive: ['active', 'archived'],
    archived: [] // Archived chatbots cannot be changed
  };

  // Utility methods
  toJSON(): IChatbotInstance {
    return {
      ...this.data
    };
  }

  toPublicJSON(): Omit<IChatbotInstance, 'performance_metrics'> & {
    performance_summary: {
      avg_response_time_ms: number;
      total_conversations: number;
      total_messages: number;
      avg_user_satisfaction: number;
      success_rate: number;
    };
    estimated_cost_per_message: number;
  } {
    return {
      id: this.data.id,
      organization_id: this.data.organization_id,
      name: this.data.name,
      description: this.data.description,
      status: this.data.status,
      llm_provider: this.data.llm_provider,
      llm_model: this.data.llm_model,
      system_prompt: this.data.system_prompt,
      model_config: this.data.model_config,
      rag_enabled: this.data.rag_enabled,
      retrieval_k: this.data.retrieval_k,
      score_threshold: this.data.score_threshold,
      context_window: this.data.context_window,
      welcome_message: this.data.welcome_message,
      fallback_message: this.data.fallback_message,
      created_at: this.data.created_at,
      updated_at: this.data.updated_at,
      created_by: this.data.created_by,
      performance_summary: {
        avg_response_time_ms: this.getAverageResponseTime(),
        total_conversations: this.getTotalConversations(),
        total_messages: this.getTotalMessages(),
        avg_user_satisfaction: this.getUserSatisfactionScore(),
        success_rate: this.getSuccessRate()
      },
      estimated_cost_per_message: this.getEstimatedCostPerMessage()
    };
  }

  static generateDefaultSystemPrompt(purpose: string): string {
    const templates = {
      'customer-service': `You are a helpful customer service assistant. Your role is to:
- Answer customer questions accurately and politely
- Provide product information and specifications
- Help troubleshoot common issues
- Escalate complex problems to human agents when necessary
- Maintain a professional and friendly tone at all times`,

      'technical-support': `You are a technical support specialist. Your responsibilities include:
- Diagnosing technical issues and providing solutions
- Explaining complex technical concepts in simple terms
- Guiding users through step-by-step troubleshooting
- Recommending appropriate products or services
- Documenting common issues and solutions`,

      'sales-assistant': `You are a knowledgeable sales assistant. Your goals are to:
- Understand customer needs and preferences
- Recommend suitable products or services
- Provide detailed product comparisons
- Answer questions about pricing and availability
- Guide customers through the purchasing process`,

      'general-assistant': `You are a helpful assistant. Your purpose is to:
- Provide accurate and relevant information
- Answer questions based on available knowledge
- Be helpful, harmless, and honest in all interactions
- Admit when you don't know something
- Maintain a professional yet friendly conversational tone`
    };

    return templates[purpose as keyof typeof templates] || templates['general-assistant'];
  }

  static getRecommendedModelForUseCase(useCase: string): string {
    const recommendations = {
      'high-volume-basic': 'amazon.nova-micro-v1:0',          // Fastest, lowest cost
      'balanced-performance': 'amazon.nova-lite-v1:0',       // Balanced cost/performance
      'complex-reasoning': 'amazon.nova-pro-v1:0',           // Advanced reasoning capabilities
      'cost-effective': 'amazon.nova-micro-v1:0',            // Most cost-effective option
      'multilingual': 'amazon.nova-lite-v1:0',               // Good multilingual support
      'customer-service': 'amazon.nova-micro-v1:0',          // Fast responses for support
      'technical-support': 'amazon.nova-lite-v1:0',          // Technical complexity handling
      'sales-assistant': 'amazon.nova-lite-v1:0',            // Persuasive and informative
      'general-assistant': 'amazon.nova-micro-v1:0'          // Default general use
    };

    return recommendations[useCase as keyof typeof recommendations] ||
           'amazon.nova-micro-v1:0';  // Default to Nova Micro for cost efficiency
  }
}

// Default chatbot configurations by use case
export const DEFAULT_CHATBOT_CONFIGURATIONS = {
  'customer-service': {
    llm_model: 'amazon.nova-micro-v1:0',  // Cost-effective for high-volume support
    rag_enabled: true,
    retrieval_k: 5,
    score_threshold: 0.75,
    context_window: 4000,
    model_config: {
      temperature: 0.3,        // Low temperature for consistent responses
      max_tokens: 500,         // Efficient token usage
      top_p: 0.9
    }
  },
  'technical-support': {
    llm_model: 'amazon.nova-lite-v1:0',   // Balanced performance for technical queries
    rag_enabled: true,
    retrieval_k: 8,
    score_threshold: 0.7,
    context_window: 6000,
    model_config: {
      temperature: 0.5,        // Moderate temperature for technical accuracy
      max_tokens: 1000,        // Standard token count for detailed responses
      top_p: 0.9
    }
  },
  'sales-assistant': {
    llm_model: 'amazon.nova-lite-v1:0',   // Good balance for persuasive responses
    rag_enabled: true,
    retrieval_k: 6,
    score_threshold: 0.8,
    context_window: 4000,
    model_config: {
      temperature: 0.7,        // Higher temperature for engaging responses
      max_tokens: 1000,        // Standard token count for sales conversations
      top_p: 0.9
    }
  },
  'general-assistant': {
    llm_model: 'amazon.nova-micro-v1:0',  // Default cost-effective option
    rag_enabled: true,
    retrieval_k: 5,
    score_threshold: 0.7,
    context_window: 4000,
    model_config: {
      temperature: 0.7,        // Balanced temperature for general use
      max_tokens: 500,         // Cost-efficient token usage
      top_p: 0.9
    }
  },
  'advanced-reasoning': {
    llm_model: 'amazon.nova-pro-v1:0',    // Premium model for complex tasks
    rag_enabled: true,
    retrieval_k: 10,
    score_threshold: 0.6,
    context_window: 8000,
    model_config: {
      temperature: 0.8,        // Higher temperature for creative reasoning
      max_tokens: 2000,        // More tokens for detailed analysis
      top_p: 0.9
    }
  }
};

// Additional types for service layer
export interface ChatbotWithProducts extends IChatbotInstance {
  assigned_products?: Array<{
    id: string;
    name: string;
    category: string;
  }>;
}

export interface ChatbotListFilters {
  status?: string;
  model_provider?: string;
  environment?: string;
  search?: string;
}

export interface ChatbotListResponse {
  chatbots: ChatbotWithProducts[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Token costs export for external use
export const TOKEN_COSTS = ChatbotInstanceModel.TOKEN_COSTS;

// ChatbotModel type alias for external use
export type ChatbotModel = string;

// Additional exports for service layer
export const LLM_PROVIDERS = ['bedrock', 'openai', 'anthropic'] as const;

export const DEFAULT_SYSTEM_PROMPTS = {
  'customer-service': ChatbotInstanceModel.generateDefaultSystemPrompt('customer-service'),
  'technical-support': ChatbotInstanceModel.generateDefaultSystemPrompt('technical-support'),
  'sales-assistant': ChatbotInstanceModel.generateDefaultSystemPrompt('sales-assistant'),
  'general-assistant': ChatbotInstanceModel.generateDefaultSystemPrompt('general-assistant')
};

export default ChatbotInstanceModel;