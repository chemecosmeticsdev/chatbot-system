/**
 * Conversation Service
 *
 * Handles conversation session management and message flow.
 * Manages multi-platform sessions (web, Line OA, WhatsApp, etc.).
 */

import { Client } from 'pg';
import {
  ConversationSession,
  CreateConversationSession,
  UpdateConversationSession,
  ConversationSessionSchema,
  CreateConversationSessionSchema,
  UpdateConversationSessionSchema,
  ConversationPlatform,
  ConversationStatus,
  PLATFORM_CONFIGURATIONS
} from '@/lib/models/conversation';
import ConversationSessionModel from '@/lib/models/conversation';

// Service-specific types
interface ConversationWithMessages extends ConversationSession {
  messages: Message[];
  messageCount: number;
}

interface ConversationListFilters {
  chatbot_instance_id?: string;
  status?: ConversationStatus;
  platform?: ConversationPlatform;
  user_identifier?: string;
  date_from?: Date;
  date_to?: Date;
  limit?: number;
  offset?: number;
}

interface ConversationListResponse {
  conversations: ConversationWithMessages[];
  total: number;
  hasMore: boolean;
}

// Constants
const MAX_INACTIVE_HOURS = 24;
const SESSION_LIMITS = {
  MAX_DURATION_HOURS: 72,
  MAX_MESSAGES_PER_SESSION: 1000,
  CLEANUP_INTERVAL_HOURS: 6
};
const CONVERSATION_PLATFORMS = ['web', 'line', 'whatsapp', 'messenger', 'api'] as const;
import {
  Message,
  CreateMessage,
  MessageSchema,
  CreateMessageSchema,
  MessageModel
} from '@/lib/models/message';
import { withDatabaseMonitoring, withExternalApiMonitoring } from '@/lib/monitoring/api-wrapper';
import { SentryUtils, ConversationError } from '@/lib/monitoring/sentry-utils';
import VectorSearchService from '@/lib/vector/search';

export interface ConversationAnalytics {
  total_sessions: number;
  active_sessions: number;
  avg_session_duration: number;
  avg_messages_per_session: number;
  platform_breakdown: Record<string, number>;
  satisfaction_score: number;
  resolution_rate: number;
}

export interface MessageResponse {
  message: Message;
  suggested_followups?: string[];
  context_sources?: Array<{
    document_name: string;
    similarity: number;
    content_snippet: string;
  }>;
}

export interface SessionSummary {
  session_id: string;
  message_count: number;
  duration_minutes: number;
  resolution_status: 'resolved' | 'unresolved' | 'escalated';
  satisfaction_score?: number;
  key_topics: string[];
  summary: string;
}

export class ConversationService {
  private client: Client;
  private vectorService: VectorSearchService;

  constructor(client: Client) {
    this.client = client;
    this.vectorService = new VectorSearchService(client);
  }

  /**
   * Create a new conversation session
   */
  async createSession(
    data: CreateConversationSession,
    organizationId: string
  ): Promise<ConversationSession> {
    return withDatabaseMonitoring(
      async () => {
        const validatedData = CreateConversationSessionSchema.parse(data);

        // Validate platform
        if (!CONVERSATION_PLATFORMS.includes(validatedData.platform)) {
          throw new ConversationError(
            `Unsupported platform: ${validatedData.platform}`,
            { platform: validatedData.platform }
          );
        }

        // Check for existing active session for the same user/platform
        const existingSessionQuery = `
          SELECT id FROM conversation_sessions
          WHERE user_identifier = $1 AND platform = $2 AND status = 'active'
            AND chatbot_id = $3
          ORDER BY created_at DESC
          LIMIT 1
        `;

        const existingResult = await this.client.query(existingSessionQuery, [
          validatedData.user_identifier,
          validatedData.platform,
          validatedData.chatbot_instance_id
        ]);

        if (existingResult.rows.length > 0) {
          // Return existing session instead of creating new one
          const existingId = existingResult.rows[0].id;
          const session = await this.getById(existingId, organizationId);
          if (session) {
            // Update last activity
            await this.updateLastActivity(existingId, organizationId);
            return session;
          }
        }

        const query = `
          INSERT INTO conversation_sessions (
            chatbot_id, user_identifier, platform, status, metadata
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;

        const values = [
          validatedData.chatbot_instance_id,
          validatedData.user_identifier,
          validatedData.platform,
          'active',
          JSON.stringify(validatedData.session_metadata || {})
        ];

        const result = await this.client.query(query, values);

        if (result.rows.length === 0) {
          throw new ConversationError('Failed to create conversation session');
        }

        const session = ConversationSessionSchema.parse(result.rows[0]);

        // Log successful session creation
        SentryUtils.captureConversation({
          chatbotId: session.chatbot_instance_id,
          sessionId: session.id,
          messageId: 'session_start',
          messageType: 'system_message',
          success: true,
          metadata: {
            platform: session.platform,
            user_identifier: session.user_identifier
          }
        });

        return session;
      },
      {
        operation: 'createSession',
        table: 'conversation_sessions',
        organizationId,
        additionalData: {
          chatbot_id: data.chatbot_instance_id,
          platform: data.platform
        }
      }
    );
  }

  /**
   * Get conversation session by ID
   */
  async getById(id: string, organizationId: string): Promise<ConversationSession | null> {
    return withDatabaseMonitoring(
      async () => {
        const query = `
          SELECT cs.* FROM conversation_sessions cs
          JOIN chatbot_instances ci ON cs.chatbot_id = ci.id
          WHERE cs.id = $1 AND ci.organization_id = $2
        `;

        const result = await this.client.query(query, [id, organizationId]);

        if (result.rows.length === 0) {
          return null;
        }

        return ConversationSessionSchema.parse(result.rows[0]);
      },
      {
        operation: 'getById',
        table: 'conversation_sessions',
        organizationId,
        additionalData: { session_id: id }
      }
    );
  }

  /**
   * List conversation sessions with filtering and pagination
   */
  async list(
    organizationId: string,
    filters: ConversationListFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<ConversationListResponse> {
    return withDatabaseMonitoring(
      async () => {
        const offset = (page - 1) * limit;
        const whereConditions = ['ci.organization_id = $1'];
        const queryParams: any[] = [organizationId];
        let paramIndex = 2;

        // Apply filters
        if (filters.chatbot_instance_id) {
          whereConditions.push(`cs.chatbot_id = $${paramIndex}`);
          queryParams.push(filters.chatbot_instance_id);
          paramIndex++;
        }

        if (filters.status) {
          whereConditions.push(`cs.status = $${paramIndex}`);
          queryParams.push(filters.status);
          paramIndex++;
        }

        if (filters.platform) {
          whereConditions.push(`cs.platform = $${paramIndex}`);
          queryParams.push(filters.platform);
          paramIndex++;
        }

        if (filters.user_identifier) {
          whereConditions.push(`cs.user_identifier ILIKE $${paramIndex}`);
          queryParams.push(`%${filters.user_identifier}%`);
          paramIndex++;
        }

        if (filters.date_from) {
          whereConditions.push(`cs.created_at >= $${paramIndex}`);
          queryParams.push(filters.date_from);
          paramIndex++;
        }

        if (filters.date_to) {
          whereConditions.push(`cs.created_at <= $${paramIndex}`);
          queryParams.push(filters.date_to);
          paramIndex++;
        }

        const whereClause = whereConditions.join(' AND ');

        // Get total count
        const countQuery = `
          SELECT COUNT(*) FROM conversation_sessions cs
          JOIN chatbot_instances ci ON cs.chatbot_id = ci.id
          WHERE ${whereClause}
        `;
        const countResult = await this.client.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].count);

        // Get conversations with message counts
        const query = `
          SELECT
            cs.*,
            ci.name as chatbot_name,
            COUNT(m.id) as message_count,
            MAX(m.created_at) as last_message_at
          FROM conversation_sessions cs
          JOIN chatbot_instances ci ON cs.chatbot_id = ci.id
          LEFT JOIN messages m ON cs.id = m.session_id
          WHERE ${whereClause}
          GROUP BY cs.id, ci.name
          ORDER BY cs.last_activity_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(limit, offset);
        const result = await this.client.query(query, queryParams);

        const conversations = result.rows.map(row => {
          const session = ConversationSessionSchema.parse(row);
          return {
            ...session,
            chatbot_name: row.chatbot_name,
            message_count: parseInt(row.message_count),
            last_message_at: row.last_message_at
          };
        });

        return {
          conversations: conversations.map(conv => ({
            ...conv,
            messages: [], // Will be loaded separately if needed
            messageCount: conv.message_count
          })),
          total,
          hasMore: (page * limit) < total
        };
      },
      {
        operation: 'list',
        table: 'conversation_sessions',
        organizationId,
        additionalData: { filters, page, limit }
      }
    );
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    sessionId: string,
    messageData: CreateMessage,
    organizationId: string
  ): Promise<MessageResponse> {
    const startTime = Date.now();

    try {
      return await withDatabaseMonitoring(
        async () => {
          // Validate session exists and is active
          const session = await this.getById(sessionId, organizationId);
          if (!session) {
            throw new ConversationError(`Session not found: ${sessionId}`);
          }

          if (session.status !== 'active') {
            throw new ConversationError(
              `Cannot add message to ${session.status} session`,
              { session_status: session.status }
            );
          }

          // Check session limits
          await this.checkSessionLimits(sessionId, session.platform);

          const validatedData = CreateMessageSchema.parse(messageData);

          // Store the message
          const message = await this.storeMessage(sessionId, validatedData);

          // Update session last activity
          await this.updateLastActivity(sessionId, organizationId);

          // Process bot response if this is a user message
          let suggestedFollowups: string[] = [];
          let contextSources: MessageResponse['context_sources'] = [];

          if (validatedData.message_type === 'user_message') {
            // Get context from vector search
            const searchResults = await this.vectorService.similaritySearch(
              validatedData.content,
              session.chatbot_instance_id,
              sessionId
            );

            contextSources = searchResults.slice(0, 3).map(result => ({
              document_name: result.document_name || 'Unknown',
              similarity: result.similarity,
              content_snippet: result.content.substring(0, 200) + '...'
            }));

            // Generate suggested follow-ups (mock implementation)
            suggestedFollowups = await this.generateFollowUpSuggestions(validatedData.content);
          }

          const processingTime = Date.now() - startTime;

          // Log successful message processing
          SentryUtils.captureConversation({
            chatbotId: session.chatbot_instance_id,
            sessionId: sessionId,
            messageId: message.id,
            messageType: validatedData.message_type,
            success: true,
            processingTime,
            metadata: {
              content_length: validatedData.content.length,
              context_sources_count: contextSources.length,
              has_attachments: !!validatedData.attachments?.length
            }
          });

          return {
            message,
            suggested_followups: suggestedFollowups,
            context_sources: contextSources
          };
        },
        {
          operation: 'addMessage',
          table: 'messages',
          organizationId,
          additionalData: {
            session_id: sessionId,
            message_type: messageData.message_type,
            content_length: messageData.content.length
          }
        }
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Log message processing failure
      SentryUtils.captureConversation({
        chatbotId: 'unknown',
        sessionId: sessionId,
        messageId: 'unknown',
        messageType: messageData.message_type,
        success: false,
        processingTime,
        errorMessage: (error as Error).message
      });

      throw error;
    }
  }

  /**
   * Store message in database
   */
  private async storeMessage(sessionId: string, data: CreateMessage): Promise<Message> {
    const query = `
      INSERT INTO messages (
        session_id, role, content, attachments, metadata
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      sessionId,
      data.message_type,
      data.content,
      JSON.stringify(data.attachments || []),
      JSON.stringify(data.response_metadata || {})
    ];

    const result = await this.client.query(query, values);

    if (result.rows.length === 0) {
      throw new ConversationError('Failed to store message');
    }

    return MessageSchema.parse(result.rows[0]);
  }

  /**
   * Get conversation with all messages
   */
  async getWithMessages(
    sessionId: string,
    organizationId: string,
    limit: number = 50
  ): Promise<ConversationWithMessages | null> {
    return withDatabaseMonitoring(
      async () => {
        const sessionQuery = `
          SELECT cs.* FROM conversation_sessions cs
          JOIN chatbot_instances ci ON cs.chatbot_id = ci.id
          WHERE cs.id = $1 AND ci.organization_id = $2
        `;

        const sessionResult = await this.client.query(sessionQuery, [sessionId, organizationId]);

        if (sessionResult.rows.length === 0) {
          return null;
        }

        const session = ConversationSessionSchema.parse(sessionResult.rows[0]);

        // Get messages
        const messagesQuery = `
          SELECT * FROM messages
          WHERE session_id = $1
          ORDER BY created_at ASC
          LIMIT $2
        `;

        const messagesResult = await this.client.query(messagesQuery, [sessionId, limit]);
        const messages = messagesResult.rows.map(row => MessageSchema.parse(row));

        return {
          ...session,
          messages,
          messageCount: messages.length
        };
      },
      {
        operation: 'getWithMessages',
        table: 'conversation_sessions',
        organizationId,
        additionalData: {
          session_id: sessionId,
          message_limit: limit
        }
      }
    );
  }

  /**
   * Update session status
   */
  async updateStatus(
    sessionId: string,
    status: ConversationSession['status'],
    organizationId: string,
    metadata?: Record<string, any>
  ): Promise<ConversationSession> {
    return withDatabaseMonitoring(
      async () => {
        const updateData: UpdateConversationSession = {
          status
        };

        if (metadata) {
          // Get existing session to merge metadata
          const existingSession = await this.getById(sessionId, organizationId);
          if (existingSession) {
            updateData.session_metadata = {
              ...existingSession.session_metadata,
              ...metadata,
              [`${status}_at`]: new Date().toISOString()
            };
          }
        }

        const setClauses: string[] = [];
        const queryParams: any[] = [sessionId];
        let paramIndex = 2;

        Object.entries(updateData).forEach(([key, value]) => {
          if (value !== undefined) {
            if (key === 'metadata') {
              setClauses.push(`metadata = $${paramIndex}`);
              queryParams.push(JSON.stringify(value));
            } else {
              setClauses.push(`${key} = $${paramIndex}`);
              queryParams.push(value);
            }
            paramIndex++;
          }
        });

        const query = `
          UPDATE conversation_sessions cs
          SET ${setClauses.join(', ')}
          FROM chatbot_instances ci
          WHERE cs.id = $1 AND cs.chatbot_id = ci.id AND ci.organization_id = $${paramIndex}
          RETURNING cs.*
        `;

        queryParams.push(organizationId);

        const result = await this.client.query(query, queryParams);

        if (result.rows.length === 0) {
          throw new ConversationError(`Session not found: ${sessionId}`);
        }

        const session = ConversationSessionSchema.parse(result.rows[0]);

        // Log status update
        SentryUtils.addBreadcrumb('Conversation status updated', {
          session_id: sessionId,
          organization_id: organizationId,
          new_status: status,
          metadata: metadata
        });

        return session;
      },
      {
        operation: 'updateStatus',
        table: 'conversation_sessions',
        organizationId,
        additionalData: {
          session_id: sessionId,
          new_status: status
        }
      }
    );
  }

  /**
   * Close expired sessions
   */
  async closeExpiredSessions(organizationId: string): Promise<number> {
    return withDatabaseMonitoring(
      async () => {
        const query = `
          UPDATE conversation_sessions cs
          SET status = 'completed', updated_at = NOW()
          FROM chatbot_instances ci
          WHERE cs.chatbot_id = ci.id
            AND ci.organization_id = $1
            AND cs.status = 'active'
            AND cs.last_activity_at < NOW() - INTERVAL '24 hours'
        `;

        const result = await this.client.query(query, [organizationId]);
        const closedCount = result.rowCount || 0;

        // Log cleanup activity
        SentryUtils.addBreadcrumb('Expired sessions closed', {
          organization_id: organizationId,
          closed_count: closedCount
        });

        return closedCount;
      },
      {
        operation: 'closeExpiredSessions',
        table: 'conversation_sessions',
        organizationId,
        additionalData: {}
      }
    );
  }

  /**
   * Get conversation analytics
   */
  async getAnalytics(
    organizationId: string,
    chatbotId?: string,
    timeRange: '7d' | '30d' | '90d' = '30d'
  ): Promise<ConversationAnalytics> {
    return withDatabaseMonitoring(
      async () => {
        const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

        const whereConditions = ['ci.organization_id = $1'];
        const queryParams: any[] = [organizationId];
        let paramIndex = 2;

        if (chatbotId) {
          whereConditions.push(`cs.chatbot_id = $${paramIndex}`);
          queryParams.push(chatbotId);
          paramIndex++;
        }

        whereConditions.push(`cs.created_at >= NOW() - INTERVAL '${daysBack} days'`);

        const whereClause = whereConditions.join(' AND ');

        const query = `
          SELECT
            COUNT(DISTINCT cs.id) as total_sessions,
            COUNT(DISTINCT cs.id) FILTER (WHERE cs.status = 'active') as active_sessions,
            AVG(EXTRACT(EPOCH FROM (COALESCE(cs.updated_at, NOW()) - cs.created_at)) / 60) as avg_session_duration,
            AVG(message_counts.count) as avg_messages_per_session,
            AVG(m.user_feedback_score) FILTER (WHERE m.user_feedback_score IS NOT NULL) as satisfaction_score
          FROM conversation_sessions cs
          JOIN chatbot_instances ci ON cs.chatbot_id = ci.id
          LEFT JOIN (
            SELECT session_id, COUNT(*) as count
            FROM messages
            GROUP BY session_id
          ) message_counts ON cs.id = message_counts.session_id
          LEFT JOIN messages m ON cs.id = m.session_id
          WHERE ${whereClause}
        `;

        const result = await this.client.query(query, queryParams);

        // Get platform breakdown
        const platformQuery = `
          SELECT
            cs.platform,
            COUNT(*) as count
          FROM conversation_sessions cs
          JOIN chatbot_instances ci ON cs.chatbot_id = ci.id
          WHERE ${whereClause}
          GROUP BY cs.platform
        `;

        const platformResult = await this.client.query(platformQuery, queryParams);

        const row = result.rows[0] || {};
        const platformBreakdown: Record<string, number> = {};

        platformResult.rows.forEach(p => {
          platformBreakdown[p.platform] = parseInt(p.count);
        });

        const analytics: ConversationAnalytics = {
          total_sessions: parseInt(row.total_sessions) || 0,
          active_sessions: parseInt(row.active_sessions) || 0,
          avg_session_duration: parseFloat(row.avg_session_duration) || 0,
          avg_messages_per_session: parseFloat(row.avg_messages_per_session) || 0,
          platform_breakdown: platformBreakdown,
          satisfaction_score: parseFloat(row.satisfaction_score) || 0,
          resolution_rate: 0.85 // Mock value - would be calculated based on resolution tracking
        };

        return analytics;
      },
      {
        operation: 'getAnalytics',
        table: 'conversation_sessions',
        organizationId,
        additionalData: {
          chatbot_id: chatbotId,
          time_range: timeRange
        }
      }
    );
  }

  /**
   * Update last activity timestamp
   */
  private async updateLastActivity(sessionId: string, organizationId: string): Promise<void> {
    const query = `
      UPDATE conversation_sessions cs
      SET last_activity_at = NOW()
      FROM chatbot_instances ci
      WHERE cs.id = $1 AND cs.chatbot_id = ci.id AND ci.organization_id = $2
    `;

    await this.client.query(query, [sessionId, organizationId]);
  }

  /**
   * Check session limits (messages, duration, etc.)
   */
  private async checkSessionLimits(sessionId: string, platform: string): Promise<void> {
    const limits = SESSION_LIMITS;

    // Check message count limit
    const messageCountQuery = `
      SELECT COUNT(*) as count FROM messages WHERE session_id = $1
    `;

    const result = await this.client.query(messageCountQuery, [sessionId]);
    const messageCount = parseInt(result.rows[0].count);

    if (messageCount >= limits.MAX_MESSAGES_PER_SESSION) {
      throw new ConversationError(
        `Session has reached maximum message limit (${limits.MAX_MESSAGES_PER_SESSION})`,
        { message_count: messageCount, platform }
      );
    }
  }

  /**
   * Generate follow-up suggestions (mock implementation)
   */
  private async generateFollowUpSuggestions(userMessage: string): Promise<string[]> {
    // This would integrate with an LLM to generate contextual follow-ups
    const suggestions = [
      'Can you provide more details about this?',
      'What specific aspect would you like me to explain?',
      'Is there anything else I can help you with?'
    ];

    return suggestions.slice(0, 2); // Return 2 suggestions
  }

  /**
   * Generate session summary
   */
  async generateSessionSummary(
    sessionId: string,
    organizationId: string
  ): Promise<SessionSummary> {
    return withExternalApiMonitoring(
      async () => {
        const conversation = await this.getWithMessages(sessionId, organizationId);

        if (!conversation) {
          throw new ConversationError(`Session not found: ${sessionId}`);
        }

        const userMessages = conversation.messages.filter(m => m.message_type === 'user_message');
        const botMessages = conversation.messages.filter(m => m.message_type === 'bot_response');

        const duration = conversation.updated_at
          ? Math.round((new Date(conversation.updated_at).getTime() - new Date(conversation.created_at).getTime()) / (1000 * 60))
          : 0;

        // Mock summary generation - would use LLM in real implementation
        const summary: SessionSummary = {
          session_id: sessionId,
          message_count: conversation.messages.length,
          duration_minutes: duration,
          resolution_status: conversation.status === 'terminated' ? 'resolved' : 'unresolved',
          satisfaction_score: undefined, // Would be calculated from feedback
          key_topics: ['general inquiry', 'support'], // Would be extracted via NLP
          summary: `User conversation with ${userMessages.length} questions and ${botMessages.length} responses over ${duration} minutes.`
        };

        return summary;
      },
      {
        service: 'conversation_summary',
        endpoint: 'generate',
        sessionId: sessionId,
        additionalData: {
          organization_id: organizationId
        }
      }
    );
  }
}

export default ConversationService;