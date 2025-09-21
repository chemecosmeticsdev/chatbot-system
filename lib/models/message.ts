import { z } from 'zod';

/**
 * Message Database Schema
 * Individual message management for chatbot conversations
 */

// Database interface for messages table
export interface IMessage {
  id: string;
  session_id: string;
  message_type: 'user_message' | 'bot_response' | 'system_message';
  content: string;
  content_type: 'text' | 'image' | 'file' | 'quick_reply' | 'rich_media';
  timestamp: Date;
  sequence_number: number;
  response_metadata?: Record<string, any>;
  token_usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  processing_time_ms?: number;
  model_used?: string;
  confidence_score?: number;
  user_feedback?: {
    rating: number;
    feedback_text?: string;
    feedback_timestamp: Date;
  };
  attachments?: MessageAttachment[];
  created_at: Date;
  updated_at: Date;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  content_type: string;
  file_size: number;
  s3_key: string;
  thumbnail_s3_key?: string;
  created_at: Date;
}

export type MessageType = 'user_message' | 'bot_response' | 'system_message';
export type ContentType = 'text' | 'image' | 'file' | 'quick_reply' | 'rich_media';

// Input interface for creating messages
export interface ICreateMessage {
  session_id: string;
  message_type: MessageType;
  content: string;
  content_type?: ContentType;
  response_metadata?: Record<string, any>;
  token_usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  processing_time_ms?: number;
  model_used?: string;
  confidence_score?: number;
  attachments?: Omit<MessageAttachment, 'id' | 'created_at'>[];
}

// Input interface for updating messages
export interface IUpdateMessage {
  content?: string;
  response_metadata?: Record<string, any>;
  user_feedback?: {
    rating: number;
    feedback_text?: string;
    feedback_timestamp: Date;
  };
}

// Zod schemas for validation
export const MessageAttachmentSchema = z.object({
  id: z.string().uuid(),
  filename: z.string().min(1).max(500),
  content_type: z.string().min(1),
  file_size: z.number().int().min(1),
  s3_key: z.string().min(1).max(1000),
  thumbnail_s3_key: z.string().max(1000).optional(),
  created_at: z.date()
});

export const TokenUsageSchema = z.object({
  input_tokens: z.number().int().min(0),
  output_tokens: z.number().int().min(0),
  total_tokens: z.number().int().min(0)
});

export const UserFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback_text: z.string().max(1000).optional(),
  feedback_timestamp: z.date()
});

export const MessageSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  message_type: z.enum(['user_message', 'bot_response', 'system_message']),
  content: z.string().min(1).max(10000),
  content_type: z.enum(['text', 'image', 'file', 'quick_reply', 'rich_media']).default('text'),
  timestamp: z.date(),
  sequence_number: z.number().int().min(0),
  response_metadata: z.record(z.any()).optional(),
  token_usage: TokenUsageSchema.optional(),
  processing_time_ms: z.number().min(0).optional(),
  model_used: z.string().optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  user_feedback: UserFeedbackSchema.optional(),
  attachments: z.array(MessageAttachmentSchema).default([]),
  created_at: z.date(),
  updated_at: z.date()
});

export const CreateMessageSchema = z.object({
  session_id: z.string().uuid(),
  message_type: z.enum(['user_message', 'bot_response', 'system_message']),
  content: z.string().min(1).max(10000),
  content_type: z.enum(['text', 'image', 'file', 'quick_reply', 'rich_media']).optional().default('text'),
  response_metadata: z.record(z.any()).optional(),
  token_usage: TokenUsageSchema.optional(),
  processing_time_ms: z.number().min(0).optional(),
  model_used: z.string().optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  attachments: z.array(z.object({
    filename: z.string().min(1).max(500),
    content_type: z.string().min(1),
    file_size: z.number().int().min(1),
    s3_key: z.string().min(1).max(1000),
    thumbnail_s3_key: z.string().max(1000).optional()
  })).optional().default([])
});

export const UpdateMessageSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  response_metadata: z.record(z.any()).optional(),
  user_feedback: UserFeedbackSchema.optional()
});

// Type exports
export type Message = z.infer<typeof MessageSchema>;
export type CreateMessage = z.infer<typeof CreateMessageSchema>;
export type UpdateMessage = z.infer<typeof UpdateMessageSchema>;

// Message model class with business logic
export class MessageModel {
  private data: IMessage;

  constructor(data: IMessage) {
    this.data = MessageSchema.parse({
      ...data,
      timestamp: new Date(data.timestamp),
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      user_feedback: data.user_feedback ? {
        ...data.user_feedback,
        feedback_timestamp: new Date(data.user_feedback.feedback_timestamp)
      } : undefined,
      attachments: (data.attachments || []).map(att => ({
        ...att,
        created_at: new Date(att.created_at)
      }))
    });
  }

  // Getters
  get id(): string {
    return this.data.id;
  }

  get sessionId(): string {
    return this.data.session_id;
  }

  get messageType(): MessageType {
    return this.data.message_type;
  }

  get content(): string {
    return this.data.content;
  }

  get contentType(): ContentType {
    return this.data.content_type;
  }

  get timestamp(): Date {
    return this.data.timestamp;
  }

  get sequenceNumber(): number {
    return this.data.sequence_number;
  }

  get responseMetadata(): Record<string, any> | undefined {
    return this.data.response_metadata;
  }

  get tokenUsage(): { input_tokens: number; output_tokens: number; total_tokens: number } | undefined {
    return this.data.token_usage;
  }

  get processingTimeMs(): number | undefined {
    return this.data.processing_time_ms;
  }

  get modelUsed(): string | undefined {
    return this.data.model_used;
  }

  get confidenceScore(): number | undefined {
    return this.data.confidence_score;
  }

  get userFeedback(): { rating: number; feedback_text?: string; feedback_timestamp: Date } | undefined {
    return this.data.user_feedback;
  }

  get attachments(): MessageAttachment[] {
    return this.data.attachments || [];
  }

  get createdAt(): Date {
    return this.data.created_at;
  }

  get updatedAt(): Date {
    return this.data.updated_at;
  }

  // Business logic methods
  isUserMessage(): boolean {
    return this.data.message_type === 'user_message';
  }

  isBotResponse(): boolean {
    return this.data.message_type === 'bot_response';
  }

  isSystemMessage(): boolean {
    return this.data.message_type === 'system_message';
  }

  hasAttachments(): boolean {
    return this.data.attachments !== undefined && this.data.attachments.length > 0;
  }

  hasUserFeedback(): boolean {
    return this.data.user_feedback !== undefined;
  }

  isPositiveFeedback(): boolean {
    return this.data.user_feedback !== undefined && this.data.user_feedback.rating >= 4;
  }

  isNegativeFeedback(): boolean {
    return this.data.user_feedback !== undefined && this.data.user_feedback.rating <= 2;
  }

  hasHighConfidence(): boolean {
    return this.data.confidence_score !== undefined && this.data.confidence_score > 0.8;
  }

  hasLowConfidence(): boolean {
    return this.data.confidence_score !== undefined && this.data.confidence_score < 0.5;
  }

  wasSlowResponse(): boolean {
    return this.data.processing_time_ms !== undefined &&
           this.data.processing_time_ms > MessageModel.SLOW_RESPONSE_THRESHOLD_MS;
  }

  getWordCount(): number {
    return this.data.content.trim().split(/\s+/).length;
  }

  getCharacterCount(): number {
    return this.data.content.length;
  }

  getEstimatedReadingTimeSeconds(): number {
    const wordsPerMinute = 200; // Average reading speed
    const words = this.getWordCount();
    return Math.ceil((words / wordsPerMinute) * 60);
  }

  getTokenCost(): number {
    if (!this.data.token_usage || !this.data.model_used) return 0;

    const costs = MessageModel.TOKEN_COSTS[this.data.model_used];
    if (!costs) return 0;

    const inputCost = (this.data.token_usage.input_tokens / 1000) * costs.input;
    const outputCost = (this.data.token_usage.output_tokens / 1000) * costs.output;

    return inputCost + outputCost;
  }

  getTotalAttachmentSize(): number {
    return this.data.attachments?.reduce((total, att) => total + att.file_size, 0) || 0;
  }

  hasMetadata(key: string): boolean {
    return this.data.response_metadata !== undefined && key in this.data.response_metadata;
  }

  getMetadata(key: string): any {
    return this.data.response_metadata?.[key];
  }

  addUserFeedback(rating: number, feedbackText?: string): void {
    this.data.user_feedback = {
      rating,
      feedback_text: feedbackText,
      feedback_timestamp: new Date()
    };
    this.data.updated_at = new Date();
  }

  updateMetadata(key: string, value: any): void {
    if (!this.data.response_metadata) {
      this.data.response_metadata = {};
    }
    this.data.response_metadata[key] = value;
    this.data.updated_at = new Date();
  }

  // Validation methods
  static validateCreate(data: unknown): CreateMessage {
    return CreateMessageSchema.parse(data);
  }

  static validateUpdate(data: unknown): UpdateMessage {
    return UpdateMessageSchema.parse(data);
  }

  // Constants
  static readonly MAX_CONTENT_LENGTH = 10000;
  static readonly SLOW_RESPONSE_THRESHOLD_MS = 5000; // 5 seconds
  static readonly MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
  static readonly MAX_ATTACHMENTS_PER_MESSAGE = 5;

  static readonly SUPPORTED_ATTACHMENT_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  static readonly TOKEN_COSTS = {
    // Amazon Nova models (AWS Bedrock pricing per 1K tokens) - NEW DEFAULTS
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
    'gpt-4o': { input: 0.005, output: 0.015 },
    // Anthropic direct API pricing
    'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
    'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
    'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
    'claude-3-5-sonnet-20240620': { input: 0.003, output: 0.015 }
  };

  static readonly MESSAGE_TYPE_ICONS = {
    user_message: 'user',
    bot_response: 'bot',
    system_message: 'settings'
  };

  static readonly CONTENT_TYPE_LIMITS = {
    text: { max_length: 10000, supports_formatting: true },
    image: { max_size: 5 * 1024 * 1024, supported_formats: ['jpeg', 'png', 'gif', 'webp'] },
    file: { max_size: 10 * 1024 * 1024, supported_formats: ['pdf', 'doc', 'docx', 'txt', 'csv'] },
    quick_reply: { max_options: 10, max_option_length: 100 },
    rich_media: { max_elements: 5, supports_actions: true }
  };

  // Utility methods
  toJSON(): IMessage {
    return {
      ...this.data
    };
  }

  toPublicJSON(): Omit<IMessage, 'response_metadata'> & {
    word_count: number;
    character_count: number;
    estimated_reading_time_seconds: number;
    token_cost: number;
    total_attachment_size: number;
    is_positive_feedback: boolean;
    is_high_confidence: boolean;
    was_slow_response: boolean;
  } {
    return {
      id: this.data.id,
      session_id: this.data.session_id,
      message_type: this.data.message_type,
      content: this.data.content,
      content_type: this.data.content_type,
      timestamp: this.data.timestamp,
      sequence_number: this.data.sequence_number,
      token_usage: this.data.token_usage,
      processing_time_ms: this.data.processing_time_ms,
      model_used: this.data.model_used,
      confidence_score: this.data.confidence_score,
      user_feedback: this.data.user_feedback,
      attachments: this.data.attachments,
      created_at: this.data.created_at,
      updated_at: this.data.updated_at,
      word_count: this.getWordCount(),
      character_count: this.getCharacterCount(),
      estimated_reading_time_seconds: this.getEstimatedReadingTimeSeconds(),
      token_cost: this.getTokenCost(),
      total_attachment_size: this.getTotalAttachmentSize(),
      is_positive_feedback: this.isPositiveFeedback(),
      is_high_confidence: this.hasHighConfidence(),
      was_slow_response: this.wasSlowResponse()
    };
  }

  static createSystemMessage(sessionId: string, content: string, sequenceNumber: number): ICreateMessage {
    return {
      session_id: sessionId,
      message_type: 'system_message',
      content,
      content_type: 'text',
      response_metadata: {
        is_automated: true,
        system_generated: true
      }
    };
  }

  static createUserMessage(
    sessionId: string,
    content: string,
    sequenceNumber: number,
    contentType: ContentType = 'text',
    attachments?: Omit<MessageAttachment, 'id' | 'created_at'>[]
  ): ICreateMessage {
    return {
      session_id: sessionId,
      message_type: 'user_message',
      content,
      content_type: contentType,
      attachments: attachments || []
    };
  }

  static createBotResponse(
    sessionId: string,
    content: string,
    sequenceNumber: number,
    metadata?: {
      model_used?: string;
      processing_time_ms?: number;
      token_usage?: { input_tokens: number; output_tokens: number; total_tokens: number };
      confidence_score?: number;
      response_metadata?: Record<string, any>;
    }
  ): ICreateMessage {
    return {
      session_id: sessionId,
      message_type: 'bot_response',
      content,
      content_type: 'text',
      model_used: metadata?.model_used,
      processing_time_ms: metadata?.processing_time_ms,
      token_usage: metadata?.token_usage,
      confidence_score: metadata?.confidence_score,
      response_metadata: metadata?.response_metadata
    };
  }

  static formatTokenUsage(tokenUsage?: { input_tokens: number; output_tokens: number; total_tokens: number }): string {
    if (!tokenUsage) return 'N/A';
    return `${tokenUsage.total_tokens} tokens (${tokenUsage.input_tokens}in + ${tokenUsage.output_tokens}out)`;
  }

  static formatProcessingTime(timeMs?: number): string {
    if (!timeMs) return 'N/A';
    if (timeMs < 1000) return `${timeMs}ms`;
    return `${(timeMs / 1000).toFixed(2)}s`;
  }

  static calculateResponseQuality(message: IMessage): {
    score: number;
    factors: {
      confidence: number;
      speed: number;
      user_feedback: number;
      length_appropriateness: number;
    };
  } {
    let score = 0;
    const factors = {
      confidence: 0,
      speed: 0,
      user_feedback: 0,
      length_appropriateness: 0
    };

    // Confidence score (0-25 points)
    if (message.confidence_score !== undefined) {
      factors.confidence = message.confidence_score * 25;
      score += factors.confidence;
    }

    // Speed score (0-25 points)
    if (message.processing_time_ms !== undefined) {
      const speedScore = Math.max(0, 25 - (message.processing_time_ms / 200)); // 200ms = 25 points
      factors.speed = Math.min(25, speedScore);
      score += factors.speed;
    }

    // User feedback (0-25 points)
    if (message.user_feedback) {
      factors.user_feedback = (message.user_feedback.rating / 5) * 25;
      score += factors.user_feedback;
    }

    // Length appropriateness (0-25 points)
    const wordCount = message.content.trim().split(/\s+/).length;
    if (wordCount >= 10 && wordCount <= 200) {
      factors.length_appropriateness = 25;
    } else if (wordCount < 10) {
      factors.length_appropriateness = (wordCount / 10) * 25;
    } else {
      factors.length_appropriateness = Math.max(0, 25 - ((wordCount - 200) / 20));
    }
    score += factors.length_appropriateness;

    return {
      score: Math.min(100, Math.max(0, score)),
      factors
    };
  }
}

// Message analytics and metrics
export interface MessageAnalytics {
  total_messages: number;
  user_messages: number;
  bot_responses: number;
  system_messages: number;
  avg_response_time_ms: number;
  avg_tokens_per_message: number;
  avg_confidence_score: number;
  avg_user_rating: number;
  total_cost_usd: number;
  content_type_breakdown: Record<ContentType, number>;
  model_usage_breakdown: Record<string, number>;
  hourly_message_distribution: Record<string, number>;
}

// Quick reply and rich media templates
export const QUICK_REPLY_TEMPLATES = {
  satisfaction: [
    { text: '😊 Very Satisfied', value: '5' },
    { text: '🙂 Satisfied', value: '4' },
    { text: '😐 Neutral', value: '3' },
    { text: '😕 Dissatisfied', value: '2' },
    { text: '😞 Very Dissatisfied', value: '1' }
  ],
  common_actions: [
    { text: '📞 Contact Support', value: 'contact_support' },
    { text: '📄 View Documentation', value: 'view_docs' },
    { text: '🔄 Start Over', value: 'restart' },
    { text: '👋 End Chat', value: 'end_chat' }
  ]
};

export default MessageModel;