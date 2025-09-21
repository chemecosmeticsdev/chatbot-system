/**
 * Chatbot Monitoring Service
 *
 * Comprehensive monitoring and analytics service for chatbot instances.
 * Extends the existing Sentry integration (chemecosmetics organization) with
 * chatbot-specific metrics, performance tracking, cost analysis, and health reporting.
 */

import * as Sentry from '@sentry/nextjs';
import { Client } from 'pg';
import { SentryUtils, ChatbotError, VectorSearchError, LLMError, DocumentProcessingError, ConversationError, IntegrationError } from './sentry-utils';
import { withDatabaseMonitoring, withExternalApiMonitoring } from './api-wrapper';

// Type definitions for monitoring data
export interface ChatbotInteractionData {
  chatbotId: string;
  sessionId: string;
  userId?: string;
  organizationId: string;
  messageId: string;
  messageType: 'user_message' | 'bot_response' | 'system_message';
  interactionType: 'text' | 'voice' | 'file_upload' | 'quick_reply';
  platform: 'web' | 'line_oa' | 'whatsapp' | 'api' | 'iframe' | 'widget';
  timestamp: Date;
  processingTimeMs: number;
  success: boolean;
  errorMessage?: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    sessionDuration?: number;
    messageLength?: number;
    responseLength?: number;
    attachmentCount?: number;
    quickReplySelected?: string;
  };
}

export interface LLMPerformanceData {
  chatbotId: string;
  sessionId: string;
  messageId: string;
  provider: 'anthropic' | 'openai' | 'aws_bedrock' | 'google' | 'mistral';
  model: string;
  operation: 'chat_completion' | 'embedding' | 'moderation' | 'function_call';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  responseTimeMs: number;
  cost: number;
  success: boolean;
  errorType?: 'rate_limit' | 'token_limit' | 'api_error' | 'timeout' | 'invalid_request';
  errorMessage?: string;
  temperature?: number;
  maxTokens?: number;
  stopReason?: string;
  finishReason?: string;
  modelVersion?: string;
  promptLength?: number;
  contextWindowUsage?: number;
}

export interface VectorSearchData {
  chatbotId: string;
  sessionId: string;
  messageId: string;
  query: string;
  queryType: 'semantic' | 'keyword' | 'hybrid' | 'filtered';
  embeddingModel: string;
  embeddingTimeMs: number;
  searchTimeMs: number;
  totalTimeMs: number;
  resultsCount: number;
  topScore: number;
  avgScore: number;
  threshold: number;
  success: boolean;
  errorMessage?: string;
  filters?: Record<string, any>;
  metadata?: {
    indexName?: string;
    vectorDimensions?: number;
    approximateResults?: boolean;
    cacheHit?: boolean;
    documentsSearched?: number;
    productsFiltered?: string[];
  };
}

export interface DocumentProcessingData {
  organizationId: string;
  productId: string;
  documentId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  stage: 'upload' | 'virus_scan' | 'ocr' | 'text_extraction' | 'chunking' | 'embedding' | 'indexing' | 'validation';
  provider?: 'mistral_ocr' | 'llamaindex' | 'aws_textract' | 'google_vision';
  processingTimeMs: number;
  success: boolean;
  errorMessage?: string;
  cost?: number;
  metadata?: {
    pageCount?: number;
    chunkCount?: number;
    embeddingCount?: number;
    ocrConfidence?: number;
    textLength?: number;
    languageDetected?: string;
    processingQueue?: string;
    retryCount?: number;
    previousAttempts?: number;
  };
}

export interface ConversationQualityData {
  chatbotId: string;
  sessionId: string;
  messageId: string;
  organizationId: string;
  qualityMetrics: {
    responseRelevance: number; // 0-1
    userSatisfaction?: number; // 0-1 (from feedback)
    responseLength: number;
    responseTime: number;
    contextUtilization: number; // 0-1
    fallbackUsed: boolean;
    escalationTriggered: boolean;
    goalAchieved?: boolean;
  };
  contextData: {
    documentsUsed: number;
    topDocumentScore: number;
    avgDocumentScore: number;
    systemPromptLength: number;
    conversationLength: number;
    previousMessagesUsed: number;
  };
  userFeedback?: {
    rating: 1 | 2 | 3 | 4 | 5;
    feedbackText?: string;
    feedbackType: 'thumbs_up' | 'thumbs_down' | 'rating' | 'text' | 'survey';
    timestamp: Date;
  };
  followupData?: {
    suggestedFollowups: string[];
    followupSelected?: string;
    followupHelpful?: boolean;
  };
}

export interface SystemHealthMetrics {
  chatbotId: string;
  timestamp: Date;
  uptime: number;
  responseTimeP50: number;
  responseTimeP95: number;
  responseTimeP99: number;
  errorRate: number;
  successRate: number;
  activeUsers: number;
  activeSessions: number;
  requestsPerMinute: number;
  memoryUsage?: number;
  cpuUsage?: number;
  databaseConnections?: number;
  vectorSearchLatency: number;
  llmLatency: number;
  costs: {
    llmCostHourly: number;
    vectorSearchCostHourly: number;
    storageCostHourly: number;
    totalCostHourly: number;
  };
}

export interface AlertThresholds {
  responseTimeP95Ms: number;
  errorRatePercent: number;
  costPerHourUSD: number;
  userSatisfactionMinimum: number;
  vectorSearchLatencyMs: number;
  llmLatencyMs: number;
  activeUsersDrop: number;
  successRateMinimum: number;
}

export interface HealthReport {
  chatbotId: string;
  organizationId: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  overall: {
    status: 'healthy' | 'warning' | 'critical' | 'down';
    score: number; // 0-100
    uptime: number;
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    successRate: number;
    errorRate: number;
    bottlenecks: string[];
  };
  quality: {
    avgUserSatisfaction: number;
    contextRelevance: number;
    fallbackRate: number;
    escalationRate: number;
    improvementSuggestions: string[];
  };
  costs: {
    totalCost: number;
    costBreakdown: {
      llm: number;
      vectorSearch: number;
      storage: number;
      other: number;
    };
    costTrends: Array<{
      date: string;
      cost: number;
    }>;
    costOptimizations: string[];
  };
  usage: {
    totalConversations: number;
    totalMessages: number;
    uniqueUsers: number;
    platformBreakdown: Record<string, number>;
    peakHours: Array<{
      hour: number;
      usage: number;
    }>;
  };
  alerts: Array<{
    type: 'performance' | 'cost' | 'quality' | 'error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
    resolved: boolean;
  }>;
  recommendations: string[];
}

/**
 * Comprehensive Chatbot Monitoring Service
 *
 * Provides detailed monitoring, analytics, and health reporting for chatbot instances.
 * Integrates with the existing Sentry setup (chemecosmetics organization) for
 * error tracking, performance monitoring, and real-time alerts.
 */
export class ChatbotMonitoringService {
  private dbClient: Client;
  private alertThresholds: Map<string, AlertThresholds> = new Map();

  constructor(dbClient: Client) {
    this.dbClient = dbClient;
    this.initializeDefaultThresholds();
  }

  /**
   * Initialize default alert thresholds for chatbot monitoring
   */
  private initializeDefaultThresholds() {
    const defaultThresholds: AlertThresholds = {
      responseTimeP95Ms: 2000,
      errorRatePercent: 5,
      costPerHourUSD: 10,
      userSatisfactionMinimum: 0.7,
      vectorSearchLatencyMs: 200,
      llmLatencyMs: 1500,
      activeUsersDrop: 50,
      successRateMinimum: 0.95
    };

    // Set default thresholds - can be overridden per chatbot
    this.alertThresholds.set('default', defaultThresholds);
  }

  /**
   * Track chatbot interaction with comprehensive context and metadata
   */
  async trackChatbotInteraction(data: ChatbotInteractionData): Promise<void> {
    try {
      // Store interaction data in database
      await withDatabaseMonitoring(
        async () => {
          await this.dbClient.query(`
            INSERT INTO chatbot_interactions (
              chatbot_id, session_id, user_id, organization_id, message_id,
              message_type, interaction_type, platform, timestamp,
              processing_time_ms, success, error_message, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [
            data.chatbotId, data.sessionId, data.userId, data.organizationId,
            data.messageId, data.messageType, data.interactionType, data.platform,
            data.timestamp, data.processingTimeMs, data.success, data.errorMessage,
            JSON.stringify(data.metadata || {})
          ]);
        },
        {
          operation: 'insert',
          table: 'chatbot_interactions',
          organizationId: data.organizationId,
          additionalData: {
            chatbot_id: data.chatbotId,
            session_id: data.sessionId,
            message_type: data.messageType,
            platform: data.platform
          }
        }
      );

      // Send to Sentry for real-time monitoring
      SentryUtils.captureConversation({
        chatbotId: data.chatbotId,
        sessionId: data.sessionId,
        messageId: data.messageId,
        messageType: data.messageType,
        success: data.success,
        processingTime: data.processingTimeMs,
        errorMessage: data.errorMessage,
        metadata: {
          interaction_type: data.interactionType,
          platform: data.platform,
          organization_id: data.organizationId,
          user_id: data.userId,
          ...data.metadata
        }
      });

      // Check for performance issues and alert if necessary
      await this.checkPerformanceThresholds(data);

      // Update real-time metrics
      await this.updateRealTimeMetrics(data);

    } catch (error) {
      SentryUtils.captureError(error as Error, {
        chatbotId: data.chatbotId,
        sessionId: data.sessionId,
        organizationId: data.organizationId,
        operation: 'track_chatbot_interaction'
      });
      throw error;
    }
  }

  /**
   * Monitor LLM performance with detailed cost and usage tracking
   */
  async monitorLLMPerformance(data: LLMPerformanceData): Promise<void> {
    try {
      // Store LLM performance data
      await withDatabaseMonitoring(
        async () => {
          await this.dbClient.query(`
            INSERT INTO llm_performance_logs (
              chatbot_id, session_id, message_id, provider, model, operation,
              input_tokens, output_tokens, total_tokens, response_time_ms,
              cost, success, error_type, error_message, temperature,
              max_tokens, stop_reason, finish_reason, model_version,
              prompt_length, context_window_usage, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          `, [
            data.chatbotId, data.sessionId, data.messageId, data.provider,
            data.model, data.operation, data.inputTokens, data.outputTokens,
            data.totalTokens, data.responseTimeMs, data.cost, data.success,
            data.errorType, data.errorMessage, data.temperature, data.maxTokens,
            data.stopReason, data.finishReason, data.modelVersion,
            data.promptLength, data.contextWindowUsage, new Date()
          ]);
        },
        {
          operation: 'insert',
          table: 'llm_performance_logs',
          additionalData: {
            chatbot_id: data.chatbotId,
            provider: data.provider,
            model: data.model,
            operation: data.operation
          }
        }
      );

      // Send enhanced LLM metrics to Sentry
      SentryUtils.captureLLMInteraction({
        chatbotId: data.chatbotId,
        sessionId: data.sessionId,
        model: `${data.provider}/${data.model}`,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        responseTime: data.responseTimeMs,
        success: data.success,
        errorMessage: data.errorMessage
      });

      // Additional Sentry context for LLM performance
      Sentry.withScope((scope) => {
        scope.setTag('llm_provider', data.provider);
        scope.setTag('llm_model', data.model);
        scope.setTag('llm_operation', data.operation);
        scope.setTag('chatbot_id', data.chatbotId);

        scope.setContext('llm_performance', {
          provider: data.provider,
          model: data.model,
          operation: data.operation,
          input_tokens: data.inputTokens,
          output_tokens: data.outputTokens,
          total_tokens: data.totalTokens,
          response_time_ms: data.responseTimeMs,
          cost_usd: data.cost,
          temperature: data.temperature,
          max_tokens: data.maxTokens,
          context_window_usage: data.contextWindowUsage,
          success: data.success,
          error_type: data.errorType
        });

        if (data.success) {
          Sentry.addBreadcrumb({
            message: `LLM API Success: ${data.provider}/${data.model}`,
            level: 'info',
            data: {
              operation: data.operation,
              tokens: data.totalTokens,
              cost: data.cost,
              response_time_ms: data.responseTimeMs
            }
          });
        } else {
          Sentry.captureException(new LLMError(data.errorMessage || 'LLM API failed', {
            provider: data.provider,
            model: data.model,
            operation: data.operation,
            error_type: data.errorType,
            tokens: data.totalTokens,
            cost: data.cost
          }));
        }
      });

      // Check cost and performance thresholds
      await this.checkLLMThresholds(data);

    } catch (error) {
      SentryUtils.captureError(error as Error, {
        chatbotId: data.chatbotId,
        sessionId: data.sessionId,
        operation: 'monitor_llm_performance'
      });
      throw error;
    }
  }

  /**
   * Track vector search performance and accuracy metrics
   */
  async trackVectorSearch(data: VectorSearchData): Promise<void> {
    try {
      // Store vector search performance data
      await withDatabaseMonitoring(
        async () => {
          await this.dbClient.query(`
            INSERT INTO vector_search_logs (
              chatbot_id, session_id, message_id, query, query_type,
              embedding_model, embedding_time_ms, search_time_ms, total_time_ms,
              results_count, top_score, avg_score, threshold, success,
              error_message, filters, metadata, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          `, [
            data.chatbotId, data.sessionId, data.messageId, data.query,
            data.queryType, data.embeddingModel, data.embeddingTimeMs,
            data.searchTimeMs, data.totalTimeMs, data.resultsCount,
            data.topScore, data.avgScore, data.threshold, data.success,
            data.errorMessage, JSON.stringify(data.filters || {}),
            JSON.stringify(data.metadata || {}), new Date()
          ]);
        },
        {
          operation: 'insert',
          table: 'vector_search_logs',
          additionalData: {
            chatbot_id: data.chatbotId,
            query_type: data.queryType,
            embedding_model: data.embeddingModel
          }
        }
      );

      // Enhanced Sentry vector search tracking
      SentryUtils.captureVectorSearch({
        chatbotId: data.chatbotId,
        sessionId: data.sessionId,
        query: data.query,
        resultsCount: data.resultsCount,
        searchTime: data.totalTimeMs,
        success: data.success,
        errorMessage: data.errorMessage
      });

      // Additional detailed context for Sentry
      Sentry.withScope((scope) => {
        scope.setTag('vector_query_type', data.queryType);
        scope.setTag('embedding_model', data.embeddingModel);
        scope.setTag('chatbot_id', data.chatbotId);

        scope.setContext('vector_search_performance', {
          query_type: data.queryType,
          embedding_model: data.embeddingModel,
          embedding_time_ms: data.embeddingTimeMs,
          search_time_ms: data.searchTimeMs,
          total_time_ms: data.totalTimeMs,
          results_count: data.resultsCount,
          top_score: data.topScore,
          avg_score: data.avgScore,
          threshold: data.threshold,
          query_length: data.query.length,
          ...data.metadata
        });

        if (!data.success) {
          Sentry.captureException(new VectorSearchError(data.errorMessage || 'Vector search failed', {
            query_type: data.queryType,
            embedding_model: data.embeddingModel,
            search_time_ms: data.totalTimeMs,
            results_count: data.resultsCount
          }));
        }
      });

      // Performance validation (vector search should be < 200ms)
      if (data.success && data.totalTimeMs > 200) {
        SentryUtils.addBreadcrumb(`Slow Vector Search: ${data.totalTimeMs}ms`, {
          chatbot_id: data.chatbotId,
          query_type: data.queryType,
          total_time_ms: data.totalTimeMs,
          threshold: 200
        }, 'warning');
      }

      // Check search quality thresholds
      await this.checkVectorSearchThresholds(data);

    } catch (error) {
      SentryUtils.captureError(error as Error, {
        chatbotId: data.chatbotId,
        sessionId: data.sessionId,
        operation: 'track_vector_search'
      });
      throw error;
    }
  }

  /**
   * Monitor document processing pipeline with detailed stage tracking
   */
  async monitorDocumentProcessing(data: DocumentProcessingData): Promise<void> {
    try {
      // Store document processing metrics
      await withDatabaseMonitoring(
        async () => {
          await this.dbClient.query(`
            INSERT INTO document_processing_logs (
              organization_id, product_id, document_id, filename, file_size,
              mime_type, stage, provider, processing_time_ms, success,
              error_message, cost, metadata, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          `, [
            data.organizationId, data.productId, data.documentId, data.filename,
            data.fileSize, data.mimeType, data.stage, data.provider,
            data.processingTimeMs, data.success, data.errorMessage, data.cost,
            JSON.stringify(data.metadata || {}), new Date()
          ]);
        },
        {
          operation: 'insert',
          table: 'document_processing_logs',
          organizationId: data.organizationId,
          additionalData: {
            product_id: data.productId,
            document_id: data.documentId,
            stage: data.stage,
            provider: data.provider
          }
        }
      );

      // Enhanced Sentry document processing tracking
      SentryUtils.captureDocumentProcessing({
        organizationId: data.organizationId,
        productId: data.productId,
        documentId: data.documentId,
        stage: data.stage,
        success: data.success,
        duration: data.processingTimeMs,
        errorMessage: data.errorMessage,
        metadata: {
          filename: data.filename,
          file_size: data.fileSize,
          mime_type: data.mimeType,
          provider: data.provider,
          cost: data.cost,
          ...data.metadata
        }
      });

      // Additional Sentry context for document processing
      Sentry.withScope((scope) => {
        scope.setTag('document_stage', data.stage);
        scope.setTag('document_provider', data.provider);
        scope.setTag('organization_id', data.organizationId);
        scope.setTag('file_type', data.mimeType);

        scope.setContext('document_processing', {
          filename: data.filename,
          file_size_bytes: data.fileSize,
          mime_type: data.mimeType,
          stage: data.stage,
          provider: data.provider,
          processing_time_ms: data.processingTimeMs,
          cost_usd: data.cost,
          success: data.success,
          ...data.metadata
        });

        if (!data.success) {
          Sentry.captureException(new DocumentProcessingError(
            data.errorMessage || `Document processing failed at ${data.stage}`,
            {
              stage: data.stage,
              provider: data.provider,
              filename: data.filename,
              file_size: data.fileSize,
              mime_type: data.mimeType
            }
          ));
        }
      });

      // Check processing performance thresholds
      await this.checkDocumentProcessingThresholds(data);

    } catch (error) {
      SentryUtils.captureError(error as Error, {
        organizationId: data.organizationId,
        operation: 'monitor_document_processing'
      });
      throw error;
    }
  }

  /**
   * Track conversation quality metrics and user satisfaction
   */
  async trackConversationQuality(data: ConversationQualityData): Promise<void> {
    try {
      // Store conversation quality metrics
      await withDatabaseMonitoring(
        async () => {
          await this.dbClient.query(`
            INSERT INTO conversation_quality_logs (
              chatbot_id, session_id, message_id, organization_id,
              response_relevance, user_satisfaction, response_length,
              response_time, context_utilization, fallback_used,
              escalation_triggered, goal_achieved, documents_used,
              top_document_score, avg_document_score, system_prompt_length,
              conversation_length, previous_messages_used, user_feedback,
              followup_data, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
          `, [
            data.chatbotId, data.sessionId, data.messageId, data.organizationId,
            data.qualityMetrics.responseRelevance, data.qualityMetrics.userSatisfaction,
            data.qualityMetrics.responseLength, data.qualityMetrics.responseTime,
            data.qualityMetrics.contextUtilization, data.qualityMetrics.fallbackUsed,
            data.qualityMetrics.escalationTriggered, data.qualityMetrics.goalAchieved,
            data.contextData.documentsUsed, data.contextData.topDocumentScore,
            data.contextData.avgDocumentScore, data.contextData.systemPromptLength,
            data.contextData.conversationLength, data.contextData.previousMessagesUsed,
            JSON.stringify(data.userFeedback || {}), JSON.stringify(data.followupData || {}),
            new Date()
          ]);
        },
        {
          operation: 'insert',
          table: 'conversation_quality_logs',
          organizationId: data.organizationId,
          additionalData: {
            chatbot_id: data.chatbotId,
            session_id: data.sessionId,
            message_id: data.messageId
          }
        }
      );

      // Send quality metrics to Sentry
      Sentry.withScope((scope) => {
        scope.setTag('chatbot_id', data.chatbotId);
        scope.setTag('organization_id', data.organizationId);
        scope.setTag('quality_assessment', 'conversation_quality');

        scope.setContext('conversation_quality', {
          response_relevance: data.qualityMetrics.responseRelevance,
          user_satisfaction: data.qualityMetrics.userSatisfaction,
          response_length: data.qualityMetrics.responseLength,
          response_time_ms: data.qualityMetrics.responseTime,
          context_utilization: data.qualityMetrics.contextUtilization,
          fallback_used: data.qualityMetrics.fallbackUsed,
          escalation_triggered: data.qualityMetrics.escalationTriggered,
          goal_achieved: data.qualityMetrics.goalAchieved,
          documents_used: data.contextData.documentsUsed,
          top_document_score: data.contextData.topDocumentScore,
          avg_document_score: data.contextData.avgDocumentScore
        });

        // Alert on poor quality metrics
        if (data.qualityMetrics.responseRelevance < 0.5) {
          Sentry.addBreadcrumb({
            message: 'Low Response Relevance Detected',
            level: 'warning',
            data: {
              chatbot_id: data.chatbotId,
              relevance_score: data.qualityMetrics.responseRelevance,
              threshold: 0.5
            }
          });
        }

        if (data.userFeedback && data.userFeedback.rating <= 2) {
          Sentry.addBreadcrumb({
            message: 'Poor User Feedback Received',
            level: 'warning',
            data: {
              chatbot_id: data.chatbotId,
              rating: data.userFeedback.rating,
              feedback_type: data.userFeedback.feedbackType,
              feedback_text: data.userFeedback.feedbackText
            }
          });
        }

        Sentry.addBreadcrumb({
          message: 'Conversation Quality Tracked',
          level: 'info',
          data: {
            relevance: data.qualityMetrics.responseRelevance,
            satisfaction: data.qualityMetrics.userSatisfaction,
            context_usage: data.qualityMetrics.contextUtilization,
            documents_used: data.contextData.documentsUsed
          }
        });
      });

      // Check quality thresholds and generate alerts
      await this.checkQualityThresholds(data);

    } catch (error) {
      SentryUtils.captureError(error as Error, {
        chatbotId: data.chatbotId,
        sessionId: data.sessionId,
        organizationId: data.organizationId,
        operation: 'track_conversation_quality'
      });
      throw error;
    }
  }

  /**
   * Generate comprehensive health report for a chatbot instance
   */
  async generateHealthReport(
    chatbotId: string,
    period?: { start: Date; end: Date }
  ): Promise<HealthReport> {
    try {
      const endDate = period?.end || new Date();
      const startDate = period?.start || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      // Fetch chatbot and organization details
      const chatbotResult = await this.dbClient.query(
        'SELECT * FROM chatbot_instances WHERE id = $1',
        [chatbotId]
      );

      if (chatbotResult.rows.length === 0) {
        throw new ChatbotError('Chatbot not found', 'health_report', { chatbot_id: chatbotId });
      }

      const chatbot = chatbotResult.rows[0];
      const organizationId = chatbot.organization_id;

      // Gather performance metrics
      const performanceMetrics = await this.getPerformanceMetrics(chatbotId, startDate, endDate);
      const qualityMetrics = await this.getQualityMetrics(chatbotId, startDate, endDate);
      const costMetrics = await this.getCostMetrics(chatbotId, startDate, endDate);
      const usageMetrics = await this.getUsageMetrics(chatbotId, startDate, endDate);
      const currentAlerts = await this.getCurrentAlerts(chatbotId);

      // Calculate overall health score (0-100)
      const healthScore = this.calculateHealthScore({
        performance: performanceMetrics,
        quality: qualityMetrics,
        alerts: currentAlerts
      });

      // Determine overall status
      const overallStatus = this.determineOverallStatus(healthScore, currentAlerts);

      // Generate recommendations
      const recommendations = await this.generateRecommendations({
        chatbotId,
        performance: performanceMetrics,
        quality: qualityMetrics,
        costs: costMetrics,
        alerts: currentAlerts
      });

      const healthReport: HealthReport = {
        chatbotId,
        organizationId,
        generatedAt: new Date(),
        period: { start: startDate, end: endDate },
        overall: {
          status: overallStatus,
          score: healthScore,
          uptime: performanceMetrics.uptime
        },
        performance: {
          avgResponseTime: performanceMetrics.avgResponseTime,
          p95ResponseTime: performanceMetrics.p95ResponseTime,
          successRate: performanceMetrics.successRate,
          errorRate: performanceMetrics.errorRate,
          bottlenecks: performanceMetrics.bottlenecks
        },
        quality: {
          avgUserSatisfaction: qualityMetrics.avgUserSatisfaction,
          contextRelevance: qualityMetrics.contextRelevance,
          fallbackRate: qualityMetrics.fallbackRate,
          escalationRate: qualityMetrics.escalationRate,
          improvementSuggestions: qualityMetrics.improvementSuggestions
        },
        costs: costMetrics,
        usage: usageMetrics,
        alerts: currentAlerts,
        recommendations
      };

      // Store health report in database
      await this.storeHealthReport(healthReport);

      // Send health report summary to Sentry
      Sentry.withScope((scope) => {
        scope.setTag('report_type', 'health_report');
        scope.setTag('chatbot_id', chatbotId);
        scope.setTag('organization_id', organizationId);

        scope.setContext('health_report', {
          overall_status: overallStatus,
          health_score: healthScore,
          uptime: performanceMetrics.uptime,
          avg_response_time: performanceMetrics.avgResponseTime,
          success_rate: performanceMetrics.successRate,
          user_satisfaction: qualityMetrics.avgUserSatisfaction,
          total_cost: costMetrics.totalCost,
          alert_count: currentAlerts.length
        });

        Sentry.addBreadcrumb({
          message: 'Health Report Generated',
          level: 'info',
          data: {
            chatbot_id: chatbotId,
            status: overallStatus,
            score: healthScore,
            period_days: Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
          }
        });
      });

      return healthReport;

    } catch (error) {
      SentryUtils.captureError(error as Error, {
        chatbotId,
        operation: 'generate_health_report'
      });
      throw error;
    }
  }

  /**
   * Get real-time system health metrics for a chatbot
   */
  async getSystemHealthMetrics(chatbotId: string): Promise<SystemHealthMetrics> {
    try {
      const currentTime = new Date();
      const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);

      // Query recent performance metrics
      const metricsQuery = `
        SELECT
          AVG(processing_time_ms) as avg_response_time,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY processing_time_ms) as p50_response_time,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY processing_time_ms) as p95_response_time,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY processing_time_ms) as p99_response_time,
          COUNT(*) as total_requests,
          COUNT(*) FILTER (WHERE success = true) as successful_requests,
          COUNT(*) FILTER (WHERE success = false) as failed_requests,
          COUNT(DISTINCT session_id) as active_sessions,
          COUNT(DISTINCT user_id) as active_users
        FROM chatbot_interactions
        WHERE chatbot_id = $1 AND timestamp >= $2
      `;

      const metricsResult = await this.dbClient.query(metricsQuery, [chatbotId, oneHourAgo]);
      const metrics = metricsResult.rows[0];

      // Calculate rates
      const successRate = metrics.total_requests > 0 ?
        metrics.successful_requests / metrics.total_requests : 1;
      const errorRate = 1 - successRate;
      const requestsPerMinute = metrics.total_requests / 60;

      // Get vector search latency
      const vectorLatencyQuery = `
        SELECT AVG(total_time_ms) as avg_vector_latency
        FROM vector_search_logs
        WHERE chatbot_id = $1 AND timestamp >= $2 AND success = true
      `;
      const vectorLatencyResult = await this.dbClient.query(vectorLatencyQuery, [chatbotId, oneHourAgo]);
      const vectorLatency = vectorLatencyResult.rows[0]?.avg_vector_latency || 0;

      // Get LLM latency
      const llmLatencyQuery = `
        SELECT AVG(response_time_ms) as avg_llm_latency
        FROM llm_performance_logs
        WHERE chatbot_id = $1 AND timestamp >= $2 AND success = true
      `;
      const llmLatencyResult = await this.dbClient.query(llmLatencyQuery, [chatbotId, oneHourAgo]);
      const llmLatency = llmLatencyResult.rows[0]?.avg_llm_latency || 0;

      // Get cost metrics
      const costQuery = `
        SELECT
          SUM(cost) as total_cost,
          AVG(cost) as avg_cost_per_request
        FROM llm_performance_logs
        WHERE chatbot_id = $1 AND timestamp >= $2
      `;
      const costResult = await this.dbClient.query(costQuery, [chatbotId, oneHourAgo]);
      const costs = costResult.rows[0];

      const healthMetrics: SystemHealthMetrics = {
        chatbotId,
        timestamp: currentTime,
        uptime: 1.0, // Calculate actual uptime based on health checks
        responseTimeP50: parseFloat(metrics.p50_response_time) || 0,
        responseTimeP95: parseFloat(metrics.p95_response_time) || 0,
        responseTimeP99: parseFloat(metrics.p99_response_time) || 0,
        errorRate: errorRate,
        successRate: successRate,
        activeUsers: parseInt(metrics.active_users) || 0,
        activeSessions: parseInt(metrics.active_sessions) || 0,
        requestsPerMinute: requestsPerMinute,
        vectorSearchLatency: parseFloat(vectorLatency),
        llmLatency: parseFloat(llmLatency),
        costs: {
          llmCostHourly: parseFloat(costs.total_cost) || 0,
          vectorSearchCostHourly: 0, // Implement based on your vector DB pricing
          storageCostHourly: 0, // Implement based on your storage pricing
          totalCostHourly: parseFloat(costs.total_cost) || 0
        }
      };

      // Send metrics to Sentry
      Sentry.withScope((scope) => {
        scope.setTag('metrics_type', 'system_health');
        scope.setTag('chatbot_id', chatbotId);

        scope.setContext('system_health_metrics', healthMetrics as any);

        Sentry.addBreadcrumb({
          message: 'System Health Metrics Collected',
          level: 'info',
          data: {
            chatbot_id: chatbotId,
            success_rate: successRate,
            avg_response_time: metrics.avg_response_time,
            active_users: metrics.active_users,
            requests_per_minute: requestsPerMinute
          }
        });
      });

      return healthMetrics;

    } catch (error) {
      SentryUtils.captureError(error as Error, {
        chatbotId,
        operation: 'get_system_health_metrics'
      });
      throw error;
    }
  }

  /**
   * Set custom alert thresholds for a specific chatbot
   */
  async setAlertThresholds(chatbotId: string, thresholds: Partial<AlertThresholds>): Promise<void> {
    try {
      const currentThresholds = this.alertThresholds.get(chatbotId) ||
                                this.alertThresholds.get('default')!;

      const updatedThresholds = { ...currentThresholds, ...thresholds };
      this.alertThresholds.set(chatbotId, updatedThresholds);

      // Store thresholds in database
      await this.dbClient.query(`
        INSERT INTO chatbot_alert_thresholds (chatbot_id, thresholds, updated_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (chatbot_id)
        DO UPDATE SET thresholds = $2, updated_at = $3
      `, [chatbotId, JSON.stringify(updatedThresholds), new Date()]);

      Sentry.addBreadcrumb({
        message: 'Alert Thresholds Updated',
        level: 'info',
        data: {
          chatbot_id: chatbotId,
          updated_thresholds: Object.keys(thresholds)
        }
      });

    } catch (error) {
      SentryUtils.captureError(error as Error, {
        chatbotId,
        operation: 'set_alert_thresholds'
      });
      throw error;
    }
  }

  // Private helper methods

  private async checkPerformanceThresholds(data: ChatbotInteractionData): Promise<void> {
    const thresholds = this.alertThresholds.get(data.chatbotId) ||
                      this.alertThresholds.get('default')!;

    if (data.processingTimeMs > thresholds.responseTimeP95Ms) {
      await this.createAlert({
        chatbotId: data.chatbotId,
        type: 'performance',
        severity: 'medium',
        message: `Response time ${data.processingTimeMs}ms exceeds threshold ${thresholds.responseTimeP95Ms}ms`,
        context: {
          processing_time_ms: data.processingTimeMs,
          threshold_ms: thresholds.responseTimeP95Ms,
          session_id: data.sessionId,
          message_id: data.messageId
        }
      });
    }
  }

  private async checkLLMThresholds(data: LLMPerformanceData): Promise<void> {
    const thresholds = this.alertThresholds.get(data.chatbotId) ||
                      this.alertThresholds.get('default')!;

    if (data.responseTimeMs > thresholds.llmLatencyMs) {
      await this.createAlert({
        chatbotId: data.chatbotId,
        type: 'performance',
        severity: 'medium',
        message: `LLM response time ${data.responseTimeMs}ms exceeds threshold ${thresholds.llmLatencyMs}ms`,
        context: {
          response_time_ms: data.responseTimeMs,
          threshold_ms: thresholds.llmLatencyMs,
          provider: data.provider,
          model: data.model
        }
      });
    }

    if (data.cost > thresholds.costPerHourUSD / 60) { // Per-minute cost check
      await this.createAlert({
        chatbotId: data.chatbotId,
        type: 'cost',
        severity: 'high',
        message: `LLM cost $${data.cost} for single request is unusually high`,
        context: {
          cost_usd: data.cost,
          provider: data.provider,
          model: data.model,
          total_tokens: data.totalTokens
        }
      });
    }
  }

  private async checkVectorSearchThresholds(data: VectorSearchData): Promise<void> {
    const thresholds = this.alertThresholds.get(data.chatbotId) ||
                      this.alertThresholds.get('default')!;

    if (data.totalTimeMs > thresholds.vectorSearchLatencyMs) {
      await this.createAlert({
        chatbotId: data.chatbotId,
        type: 'performance',
        severity: 'medium',
        message: `Vector search time ${data.totalTimeMs}ms exceeds threshold ${thresholds.vectorSearchLatencyMs}ms`,
        context: {
          search_time_ms: data.totalTimeMs,
          threshold_ms: thresholds.vectorSearchLatencyMs,
          query_type: data.queryType,
          results_count: data.resultsCount
        }
      });
    }

    if (data.success && data.resultsCount === 0) {
      await this.createAlert({
        chatbotId: data.chatbotId,
        type: 'quality',
        severity: 'low',
        message: 'Vector search returned no results',
        context: {
          query_type: data.queryType,
          embedding_model: data.embeddingModel,
          threshold: data.threshold,
          query_length: data.query.length
        }
      });
    }
  }

  private async checkDocumentProcessingThresholds(data: DocumentProcessingData): Promise<void> {
    // Define stage-specific thresholds
    const stageThresholds = {
      upload: 30000, // 30 seconds
      virus_scan: 60000, // 1 minute
      ocr: 300000, // 5 minutes
      text_extraction: 120000, // 2 minutes
      chunking: 60000, // 1 minute
      embedding: 300000, // 5 minutes
      indexing: 120000, // 2 minutes
      validation: 30000 // 30 seconds
    };

    const threshold = stageThresholds[data.stage] || 60000;

    if (data.processingTimeMs > threshold) {
      await this.createAlert({
        chatbotId: null, // Document processing is organization-level
        organizationId: data.organizationId,
        type: 'performance',
        severity: 'medium',
        message: `Document ${data.stage} processing time ${data.processingTimeMs}ms exceeds threshold ${threshold}ms`,
        context: {
          stage: data.stage,
          processing_time_ms: data.processingTimeMs,
          threshold_ms: threshold,
          filename: data.filename,
          file_size: data.fileSize,
          provider: data.provider
        }
      });
    }
  }

  private async checkQualityThresholds(data: ConversationQualityData): Promise<void> {
    const thresholds = this.alertThresholds.get(data.chatbotId) ||
                      this.alertThresholds.get('default')!;

    if (data.qualityMetrics.responseRelevance < 0.5) {
      await this.createAlert({
        chatbotId: data.chatbotId,
        type: 'quality',
        severity: 'medium',
        message: `Low response relevance: ${data.qualityMetrics.responseRelevance}`,
        context: {
          relevance_score: data.qualityMetrics.responseRelevance,
          documents_used: data.contextData.documentsUsed,
          top_document_score: data.contextData.topDocumentScore,
          message_id: data.messageId
        }
      });
    }

    if (data.userFeedback && data.userFeedback.rating <= 2) {
      await this.createAlert({
        chatbotId: data.chatbotId,
        type: 'quality',
        severity: 'high',
        message: `Poor user feedback received: ${data.userFeedback.rating}/5`,
        context: {
          user_rating: data.userFeedback.rating,
          feedback_type: data.userFeedback.feedbackType,
          feedback_text: data.userFeedback.feedbackText,
          message_id: data.messageId
        }
      });
    }

    if (data.qualityMetrics.userSatisfaction &&
        data.qualityMetrics.userSatisfaction < thresholds.userSatisfactionMinimum) {
      await this.createAlert({
        chatbotId: data.chatbotId,
        type: 'quality',
        severity: 'medium',
        message: `User satisfaction ${data.qualityMetrics.userSatisfaction} below threshold ${thresholds.userSatisfactionMinimum}`,
        context: {
          satisfaction_score: data.qualityMetrics.userSatisfaction,
          threshold: thresholds.userSatisfactionMinimum,
          fallback_used: data.qualityMetrics.fallbackUsed,
          escalation_triggered: data.qualityMetrics.escalationTriggered
        }
      });
    }
  }

  private async createAlert(alert: {
    chatbotId?: string | null;
    organizationId?: string;
    type: 'performance' | 'cost' | 'quality' | 'error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    context?: Record<string, any>;
  }): Promise<void> {
    try {
      // Store alert in database
      await this.dbClient.query(`
        INSERT INTO chatbot_alerts (
          chatbot_id, organization_id, alert_type, severity, message, context,
          created_at, resolved, resolved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, null)
      `, [
        alert.chatbotId, alert.organizationId, alert.type, alert.severity,
        alert.message, JSON.stringify(alert.context || {}), new Date()
      ]);

      // Send to Sentry based on severity
      const sentryLevel = alert.severity === 'critical' ? 'error' :
                         alert.severity === 'high' ? 'warning' : 'info';

      SentryUtils.addBreadcrumb(`Alert: ${alert.message}`, {
        alert_type: alert.type,
        severity: alert.severity,
        chatbot_id: alert.chatbotId,
        organization_id: alert.organizationId,
        ...alert.context
      }, sentryLevel);

      // For critical alerts, capture as exception
      if (alert.severity === 'critical') {
        SentryUtils.captureError(
          new ChatbotError(alert.message, alert.type, alert.context),
          {
            chatbotId: alert.chatbotId || undefined,
            organizationId: alert.organizationId,
            operation: 'critical_alert'
          }
        );
      }

    } catch (error) {
      SentryUtils.captureError(error as Error, {
        operation: 'create_alert',
        additionalData: { alert_data: alert }
      });
    }
  }

  private async updateRealTimeMetrics(data: ChatbotInteractionData): Promise<void> {
    // Implementation for updating real-time metrics
    // This could involve updating Redis cache, sending to analytics services, etc.
  }

  private async getPerformanceMetrics(chatbotId: string, startDate: Date, endDate: Date): Promise<any> {
    // Implementation for gathering performance metrics
    // Returns aggregated performance data for the specified period
    return {};
  }

  private async getQualityMetrics(chatbotId: string, startDate: Date, endDate: Date): Promise<any> {
    // Implementation for gathering quality metrics
    // Returns aggregated quality data for the specified period
    return {};
  }

  private async getCostMetrics(chatbotId: string, startDate: Date, endDate: Date): Promise<any> {
    // Implementation for gathering cost metrics
    // Returns cost breakdown and trends for the specified period
    return {};
  }

  private async getUsageMetrics(chatbotId: string, startDate: Date, endDate: Date): Promise<any> {
    // Implementation for gathering usage metrics
    // Returns usage statistics for the specified period
    return {};
  }

  private async getCurrentAlerts(chatbotId: string): Promise<any[]> {
    // Implementation for getting current unresolved alerts
    // Returns array of active alerts for the chatbot
    return [];
  }

  private calculateHealthScore(metrics: any): number {
    // Implementation for calculating overall health score (0-100)
    // Based on performance, quality, and alert metrics
    return 85;
  }

  private determineOverallStatus(score: number, alerts: any[]): 'healthy' | 'warning' | 'critical' | 'down' {
    // Implementation for determining overall status based on score and alerts
    if (score >= 90) return 'healthy';
    if (score >= 70) return 'warning';
    if (score >= 40) return 'critical';
    return 'down';
  }

  private async generateRecommendations(context: any): Promise<string[]> {
    // Implementation for generating actionable recommendations
    // Based on performance, quality, cost, and alert data
    return [];
  }

  private async storeHealthReport(report: HealthReport): Promise<void> {
    // Implementation for storing health report in database
    // For historical tracking and trend analysis
  }
}

// Export singleton instance
let monitoringService: ChatbotMonitoringService | null = null;

export function createChatbotMonitoringService(dbClient: Client): ChatbotMonitoringService {
  if (!monitoringService) {
    monitoringService = new ChatbotMonitoringService(dbClient);
  }
  return monitoringService;
}

export function getChatbotMonitoringService(): ChatbotMonitoringService {
  if (!monitoringService) {
    throw new Error('ChatbotMonitoringService not initialized. Call createChatbotMonitoringService() first.');
  }
  return monitoringService;
}

export default ChatbotMonitoringService;