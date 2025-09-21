import { z } from 'zod';

/**
 * Conversation Session Database Schema
 * Conversation management and session tracking for chatbot interactions
 */

// Database interface for conversation_sessions table
export interface IConversationSession {
  id: string;
  chatbot_instance_id: string;
  platform: 'web' | 'line' | 'whatsapp' | 'messenger' | 'api';
  user_identifier: string;
  status: 'active' | 'inactive' | 'expired' | 'terminated';
  start_time: Date;
  end_time?: Date;
  message_count: number;
  user_satisfaction_score?: number;
  session_context: Record<string, any>;
  session_metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type ConversationStatus = 'active' | 'inactive' | 'expired' | 'terminated';
export type ConversationPlatform = 'web' | 'line' | 'whatsapp' | 'messenger' | 'api';

// Input interface for creating conversation sessions
export interface ICreateConversationSession {
  chatbot_instance_id: string;
  platform: ConversationPlatform;
  user_identifier: string;
  session_context?: Record<string, any>;
  session_metadata?: Record<string, any>;
}

// Input interface for updating conversation sessions
export interface IUpdateConversationSession {
  status?: ConversationStatus;
  user_satisfaction_score?: number;
  session_context?: Record<string, any>;
  session_metadata?: Record<string, any>;
  end_time?: Date;
}

// Zod schemas for validation
export const ConversationSessionSchema = z.object({
  id: z.string().uuid(),
  chatbot_instance_id: z.string().uuid(),
  platform: z.enum(['web', 'line', 'whatsapp', 'messenger', 'api']),
  user_identifier: z.string().min(1).max(255),
  status: z.enum(['active', 'inactive', 'expired', 'terminated']).optional(),
  start_time: z.date(),
  end_time: z.date().optional(),
  message_count: z.number().int().min(0).optional(),
  user_satisfaction_score: z.number().min(1).max(5).optional(),
  session_context: z.record(z.string(), z.any()).optional(),
  session_metadata: z.record(z.string(), z.any()).optional(),
  created_at: z.date(),
  updated_at: z.date()
});

export const CreateConversationSessionSchema = z.object({
  chatbot_instance_id: z.string().uuid(),
  platform: z.enum(['web', 'line', 'whatsapp', 'messenger', 'api']),
  user_identifier: z.string().min(1).max(255),
  session_context: z.record(z.string(), z.any()).optional(),
  session_metadata: z.record(z.string(), z.any()).optional().default({})
});

export const UpdateConversationSessionSchema = z.object({
  status: z.enum(['active', 'inactive', 'expired', 'terminated']).optional(),
  user_satisfaction_score: z.number().min(1).max(5).optional(),
  session_context: z.record(z.string(), z.any()).optional(),
  session_metadata: z.record(z.string(), z.any()).optional(),
  end_time: z.date().optional()
});

// Type exports
export type ConversationSession = z.infer<typeof ConversationSessionSchema>;
export type CreateConversationSession = z.infer<typeof CreateConversationSessionSchema>;
export type UpdateConversationSession = z.infer<typeof UpdateConversationSessionSchema>;

// Conversation session model class with business logic
export class ConversationSessionModel {
  private data: IConversationSession;

  constructor(data: IConversationSession) {
    const validatedData: IConversationSession = {
      ...data,
      status: (data.status ?? 'active') as 'active' | 'inactive' | 'expired' | 'terminated',
      start_time: new Date(data.start_time),
      end_time: data.end_time ? new Date(data.end_time) : undefined,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at)
    };

    this.data = ConversationSessionSchema.parse(validatedData);
  }

  // Getters
  get id(): string {
    return this.data.id;
  }

  get chatbotInstanceId(): string {
    return this.data.chatbot_instance_id;
  }

  get platform(): ConversationPlatform {
    return this.data.platform;
  }

  get userIdentifier(): string {
    return this.data.user_identifier;
  }

  get status(): ConversationStatus {
    return this.data.status;
  }

  get startTime(): Date {
    return this.data.start_time;
  }

  get endTime(): Date | undefined {
    return this.data.end_time;
  }

  get messageCount(): number {
    return this.data.message_count;
  }

  get userSatisfactionScore(): number | undefined {
    return this.data.user_satisfaction_score;
  }

  get sessionContext(): Record<string, any> {
    return this.data.session_context;
  }

  get sessionMetadata(): Record<string, any> {
    return this.data.session_metadata;
  }

  get createdAt(): Date {
    return this.data.created_at;
  }

  get updatedAt(): Date {
    return this.data.updated_at;
  }

  // Business logic methods
  isActive(): boolean {
    return this.data.status === 'active';
  }

  isTerminated(): boolean {
    return this.data.status === 'terminated' || this.data.status === 'expired';
  }

  hasEnded(): boolean {
    return this.data.end_time !== undefined;
  }

  getDurationMinutes(): number | undefined {
    if (!this.data.end_time) return undefined;
    return Math.round((this.data.end_time.getTime() - this.data.start_time.getTime()) / (1000 * 60));
  }

  getDurationSeconds(): number {
    const endTime = this.data.end_time || new Date();
    return Math.round((endTime.getTime() - this.data.start_time.getTime()) / 1000);
  }

  getAverageMessagesPerMinute(): number {
    const durationMinutes = this.getDurationMinutes();
    if (!durationMinutes || durationMinutes === 0) return 0;
    return this.data.message_count / durationMinutes;
  }

  shouldAutoExpire(): boolean {
    const maxInactiveHours = ConversationSessionModel.MAX_INACTIVE_HOURS[this.data.platform] || 24;
    const maxInactiveMs = maxInactiveHours * 60 * 60 * 1000;
    const timeSinceLastUpdate = Date.now() - this.data.updated_at.getTime();

    return this.data.status === 'active' && timeSinceLastUpdate > maxInactiveMs;
  }

  isHighSatisfaction(): boolean {
    return this.data.user_satisfaction_score !== undefined && this.data.user_satisfaction_score >= 4;
  }

  isLowSatisfaction(): boolean {
    return this.data.user_satisfaction_score !== undefined && this.data.user_satisfaction_score <= 2;
  }

  hasContextKey(key: string): boolean {
    return key in this.data.session_context;
  }

  getContextValue(key: string): any {
    return this.data.session_context[key];
  }

  hasMetadataKey(key: string): boolean {
    return key in this.data.session_metadata;
  }

  getMetadataValue(key: string): any {
    return this.data.session_metadata[key];
  }

  incrementMessageCount(): void {
    this.data.message_count += 1;
    this.data.updated_at = new Date();
  }

  updateContext(key: string, value: any): void {
    this.data.session_context[key] = value;
    this.data.updated_at = new Date();
  }

  updateMetadata(key: string, value: any): void {
    this.data.session_metadata[key] = value;
    this.data.updated_at = new Date();
  }

  endSession(status: ConversationStatus = 'inactive', satisfactionScore?: number): void {
    this.data.status = status;
    this.data.end_time = new Date();
    if (satisfactionScore) {
      this.data.user_satisfaction_score = satisfactionScore;
    }
    this.data.updated_at = new Date();
  }

  getSessionSummary(): {
    duration_minutes: number | undefined;
    message_count: number;
    messages_per_minute: number;
    satisfaction_score: number | undefined;
    platform: ConversationPlatform;
    status: ConversationStatus;
  } {
    return {
      duration_minutes: this.getDurationMinutes(),
      message_count: this.data.message_count,
      messages_per_minute: this.getAverageMessagesPerMinute(),
      satisfaction_score: this.data.user_satisfaction_score,
      platform: this.data.platform,
      status: this.data.status
    };
  }

  // Validation methods
  static validateCreate(data: unknown): CreateConversationSession {
    return CreateConversationSessionSchema.parse(data);
  }

  static validateUpdate(data: unknown): UpdateConversationSession {
    return UpdateConversationSessionSchema.parse(data);
  }

  // Constants
  static readonly MAX_INACTIVE_HOURS = {
    web: 2,        // 2 hours for web sessions
    line: 24,      // 24 hours for Line OA
    whatsapp: 24,  // 24 hours for WhatsApp
    messenger: 24, // 24 hours for Messenger
    api: 1         // 1 hour for API sessions
  };

  static readonly PLATFORM_LIMITS = {
    web: {
      max_sessions_per_user: 5,
      max_message_length: 2000,
      supports_attachments: true
    },
    line: {
      max_sessions_per_user: 1,
      max_message_length: 5000,
      supports_attachments: true
    },
    whatsapp: {
      max_sessions_per_user: 1,
      max_message_length: 4096,
      supports_attachments: true
    },
    messenger: {
      max_sessions_per_user: 1,
      max_message_length: 2000,
      supports_attachments: true
    },
    api: {
      max_sessions_per_user: 10,
      max_message_length: 8000,
      supports_attachments: false
    }
  };

  static readonly STATUS_TRANSITIONS = {
    active: ['inactive', 'expired', 'terminated'],
    inactive: ['active', 'expired', 'terminated'],
    expired: ['terminated'], // Can only be terminated after expiring
    terminated: [] // Terminal state
  };

  // Utility methods
  toJSON(): IConversationSession {
    return {
      ...this.data
    };
  }

  toPublicJSON(): Omit<IConversationSession, 'session_context'> & {
    duration_seconds: number;
    duration_minutes: number | undefined;
    messages_per_minute: number;
    is_high_satisfaction: boolean;
  } {
    return {
      id: this.data.id,
      chatbot_instance_id: this.data.chatbot_instance_id,
      platform: this.data.platform,
      user_identifier: this.data.user_identifier,
      status: this.data.status,
      start_time: this.data.start_time,
      end_time: this.data.end_time,
      message_count: this.data.message_count,
      user_satisfaction_score: this.data.user_satisfaction_score,
      session_metadata: this.data.session_metadata,
      created_at: this.data.created_at,
      updated_at: this.data.updated_at,
      duration_seconds: this.getDurationSeconds(),
      duration_minutes: this.getDurationMinutes(),
      messages_per_minute: this.getAverageMessagesPerMinute(),
      is_high_satisfaction: this.isHighSatisfaction()
    };
  }

  static generateUserIdentifier(platform: ConversationPlatform, rawId: string): string {
    // Generate a consistent user identifier based on platform and raw ID
    const prefix = platform.charAt(0).toUpperCase();
    const hash = rawId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    return `${prefix}${Math.abs(hash).toString(36).padStart(8, '0').toUpperCase()}`;
  }

  static createDefaultContext(platform: ConversationPlatform): Record<string, any> {
    const baseContext = {
      platform,
      session_started: new Date().toISOString(),
      user_preferences: {},
      conversation_history_summary: null
    };

    const platformSpecificContext = {
      web: {
        user_agent: null,
        referrer: null,
        viewport: null
      },
      line: {
        line_user_id: null,
        line_channel_id: null,
        rich_menu_id: null
      },
      whatsapp: {
        whatsapp_number: null,
        business_account_id: null
      },
      messenger: {
        messenger_user_id: null,
        page_id: null
      },
      api: {
        api_key_id: null,
        client_identifier: null,
        integration_type: null
      }
    };

    return {
      ...baseContext,
      ...platformSpecificContext[platform]
    };
  }

  static estimateSessionCost(messageCount: number, avgTokensPerMessage: number = 500): number {
    // Rough estimate based on typical LLM costs
    const totalTokens = messageCount * avgTokensPerMessage;
    const costPer1KTokens = 0.003; // Average cost
    return (totalTokens / 1000) * costPer1KTokens;
  }
}

// Session analytics and metrics
export interface SessionAnalytics {
  total_sessions: number;
  active_sessions: number;
  avg_duration_minutes: number;
  avg_messages_per_session: number;
  avg_satisfaction_score: number;
  platform_breakdown: Record<ConversationPlatform, number>;
  satisfaction_distribution: Record<string, number>;
  hourly_activity: Record<string, number>;
}

// Platform-specific configuration
export const PLATFORM_CONFIGURATIONS = {
  web: {
    name: 'Web Chat',
    icon: 'globe',
    color: '#2563eb',
    supports_real_time: true,
    supports_notifications: true
  },
  line: {
    name: 'LINE Official Account',
    icon: 'message-circle',
    color: '#00c300',
    supports_real_time: true,
    supports_notifications: true
  },
  whatsapp: {
    name: 'WhatsApp Business',
    icon: 'message-square',
    color: '#25d366',
    supports_real_time: true,
    supports_notifications: true
  },
  messenger: {
    name: 'Facebook Messenger',
    icon: 'facebook',
    color: '#0084ff',
    supports_real_time: true,
    supports_notifications: true
  },
  api: {
    name: 'API Integration',
    icon: 'code',
    color: '#6b7280',
    supports_real_time: false,
    supports_notifications: false
  }
};

export default ConversationSessionModel;