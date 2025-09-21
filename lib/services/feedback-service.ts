/**
 * Admin Feedback Processing Service
 *
 * Comprehensive feedback processing pipeline that analyzes admin feedback,
 * generates improvement suggestions, and manages chatbot configuration updates.
 * Integrates with AWS Bedrock for LLM analysis and includes performance tracking.
 */

import { Client } from 'pg';
import { z } from 'zod';
import { getBedrockClient } from '@/lib/aws';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { SentryUtils, ChatbotError } from '@/lib/monitoring/sentry-utils';

// Admin Feedback Database Interfaces
export interface IAdminFeedback {
  id: string;
  chatbot_id: string;
  message_id?: string;
  feedback_text: string;
  feedback_type: 'accuracy' | 'tone' | 'completeness' | 'relevance' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: string;
  status: 'pending' | 'analyzing' | 'completed' | 'applied' | 'rejected';
  analysis_results: Record<string, any>;
  suggested_improvements: FeedbackImprovement[];
  applied_changes: Record<string, any>;
  before_snapshot: Record<string, any>;
  after_snapshot: Record<string, any>;
  impact_metrics: Record<string, any>;
  created_at: Date;
  processed_at?: Date;
  applied_at?: Date;
  created_by?: string;
  processed_by?: string;
}

export interface FeedbackImprovement {
  type: 'system_prompt' | 'model_config' | 'rag_settings' | 'knowledge_filter' | 'training_data';
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_impact: string;
  implementation_steps: string[];
  test_criteria: string[];
  rollback_plan: string;
  current_value?: any;
  suggested_value?: any;
}

export interface FeedbackAnalysisResult {
  category: string;
  severity_assessment: 'low' | 'medium' | 'high' | 'critical';
  root_cause_analysis: string;
  improvement_areas: string[];
  specific_recommendations: FeedbackImprovement[];
  confidence_score: number;
  reasoning: string;
  potential_risks: string[];
  success_metrics: string[];
}

export interface FeedbackProcessingContext {
  chatbot_config?: Record<string, any>;
  recent_conversations?: any[];
  performance_metrics?: Record<string, any>;
  similar_feedback?: IAdminFeedback[];
  user_patterns?: Record<string, any>;
}

// Input Validation Schemas
export const CreateFeedbackSchema = z.object({
  chatbot_id: z.string().uuid(),
  message_id: z.string().uuid().optional(),
  feedback_text: z.string().min(10).max(5000),
  feedback_type: z.enum(['accuracy', 'tone', 'completeness', 'relevance', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  context: z.string().max(2000).optional()
});

export const FeedbackFiltersSchema = z.object({
  chatbot_id: z.string().uuid().optional(),
  feedback_type: z.enum(['accuracy', 'tone', 'completeness', 'relevance', 'other']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['pending', 'analyzing', 'completed', 'applied', 'rejected']).optional(),
  date_from: z.date().optional(),
  date_to: z.date().optional(),
  created_by: z.string().uuid().optional()
});

export type CreateFeedback = z.infer<typeof CreateFeedbackSchema>;
export type FeedbackFilters = z.infer<typeof FeedbackFiltersSchema>;

export class FeedbackProcessingError extends ChatbotError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'feedback_processing', context);
    this.name = 'FeedbackProcessingError';
  }
}

export class FeedbackService {
  private client: Client;
  private bedrock = getBedrockClient();

  // Rate limiting for feedback processing
  private processingQueue = new Map<string, Date>();
  private readonly RATE_LIMIT_MS = 30000; // 30 seconds between processing same chatbot

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Submit new admin feedback for processing
   */
  async submitFeedback(
    data: CreateFeedback,
    organizationId: string,
    createdBy?: string
  ): Promise<IAdminFeedback> {
    const validatedData = CreateFeedbackSchema.parse(data);

    // Validate chatbot exists and belongs to organization
    const chatbotQuery = `
      SELECT id, name, organization_id, system_prompt, model_config, performance_metrics
      FROM chatbot_instances
      WHERE id = $1 AND organization_id = $2
    `;

    const chatbotResult = await this.client.query(chatbotQuery, [validatedData.chatbot_id, organizationId]);

    if (chatbotResult.rows.length === 0) {
      throw new FeedbackProcessingError('Chatbot not found or access denied');
    }

    // Validate message exists if provided
    if (validatedData.message_id) {
      const messageQuery = `
        SELECT m.id FROM messages m
        JOIN conversation_sessions cs ON m.session_id = cs.id
        WHERE m.id = $1 AND cs.chatbot_id = $2
      `;

      const messageResult = await this.client.query(messageQuery, [validatedData.message_id, validatedData.chatbot_id]);

      if (messageResult.rows.length === 0) {
        throw new FeedbackProcessingError('Message not found or not associated with this chatbot');
      }
    }

    const insertQuery = `
      INSERT INTO admin_feedback (
        chatbot_id, message_id, feedback_text, feedback_type, severity,
        context, status, analysis_results, suggested_improvements,
        applied_changes, before_snapshot, after_snapshot, impact_metrics, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      validatedData.chatbot_id,
      validatedData.message_id,
      validatedData.feedback_text,
      validatedData.feedback_type,
      validatedData.severity,
      validatedData.context,
      'pending',
      JSON.stringify({}),
      JSON.stringify([]),
      JSON.stringify({}),
      JSON.stringify({}),
      JSON.stringify({}),
      JSON.stringify({}),
      createdBy
    ];

    try {
      const result = await this.client.query(insertQuery, values);
      const feedback = this.mapRowToFeedback(result.rows[0]);

      // Track feedback submission
      SentryUtils.addBreadcrumb(
        `Feedback submitted for chatbot ${validatedData.chatbot_id}`,
        {
          feedback_type: validatedData.feedback_type,
          severity: validatedData.severity,
          chatbot_id: validatedData.chatbot_id
        }
      );

      // Trigger async analysis if severity is medium or higher
      if (['medium', 'high', 'critical'].includes(validatedData.severity)) {
        this.analyzeFeedbackAsync(feedback.id, organizationId).catch(error => {
          SentryUtils.captureError(error, {
            chatbotId: validatedData.chatbot_id,
            operation: 'async_feedback_analysis',
            additionalData: { feedback_id: feedback.id }
          });
        });
      }

      return feedback;
    } catch (error: any) {
      throw new FeedbackProcessingError(`Failed to submit feedback: ${error.message}`);
    }
  }

  /**
   * Analyze feedback using LLM and generate improvement suggestions
   */
  async analyzeFeedback(feedbackId: string, organizationId: string): Promise<FeedbackAnalysisResult> {
    const feedback = await this.getFeedbackById(feedbackId, organizationId);
    if (!feedback) {
      throw new FeedbackProcessingError('Feedback not found');
    }

    // Check rate limiting
    const lastProcessed = this.processingQueue.get(feedback.chatbot_id);
    if (lastProcessed && Date.now() - lastProcessed.getTime() < this.RATE_LIMIT_MS) {
      throw new FeedbackProcessingError('Rate limit exceeded. Please wait before processing more feedback for this chatbot.');
    }

    return SentryUtils.withPerformanceMonitoring(
      'feedback_analysis',
      async () => {
        // Update status to analyzing
        await this.updateFeedbackStatus(feedbackId, 'analyzing');

        try {
          // Gather context for analysis
          const context = await this.gatherProcessingContext(feedback.chatbot_id, organizationId);

          // Perform LLM analysis
          const analysisResult = await this.performLLMAnalysis(feedback, context);

          // Generate specific improvement suggestions
          const improvements = await this.generateImprovements(analysisResult, context);

          // Store analysis results
          const updateQuery = `
            UPDATE admin_feedback
            SET analysis_results = $1, suggested_improvements = $2, status = $3, processed_at = NOW()
            WHERE id = $4
            RETURNING *
          `;

          const result = await this.client.query(updateQuery, [
            JSON.stringify(analysisResult),
            JSON.stringify(improvements),
            'completed',
            feedbackId
          ]);

          // Update rate limiting
          this.processingQueue.set(feedback.chatbot_id, new Date());

          SentryUtils.addBreadcrumb('Feedback analysis completed', {
            feedback_id: feedbackId,
            chatbot_id: feedback.chatbot_id,
            improvement_count: improvements.length
          });

          return analysisResult;
        } catch (error) {
          // Update status to failed and store error
          await this.updateFeedbackStatus(feedbackId, 'pending');
          throw error;
        }
      },
      {
        feedback_id: feedbackId,
        chatbot_id: feedback.chatbot_id,
        organization_id: organizationId
      }
    );
  }

  /**
   * Generate actionable improvement suggestions based on analysis
   */
  async generateImprovements(
    analysisResult: FeedbackAnalysisResult,
    context: FeedbackProcessingContext
  ): Promise<FeedbackImprovement[]> {
    const prompt = this.buildImprovementPrompt(analysisResult, context);

    try {
      const response = await this.bedrock.send(new InvokeModelCommand({
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 4000,
          temperature: 0.3,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      }));

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const improvements = JSON.parse(responseBody.content[0].text);

      // Validate and enhance improvements
      return this.validateAndEnhanceImprovements(improvements, context);
    } catch (error) {
      throw new FeedbackProcessingError(`Failed to generate improvements: ${(error as Error).message}`);
    }
  }

  /**
   * Apply approved improvements to chatbot configuration
   */
  async applyImprovements(
    feedbackId: string,
    improvementIds: string[],
    organizationId: string,
    appliedBy?: string
  ): Promise<void> {
    const feedback = await this.getFeedbackById(feedbackId, organizationId);
    if (!feedback) {
      throw new FeedbackProcessingError('Feedback not found');
    }

    if (feedback.status !== 'completed') {
      throw new FeedbackProcessingError('Feedback must be analyzed before applying improvements');
    }

    return SentryUtils.withPerformanceMonitoring(
      'apply_feedback_improvements',
      async () => {
        // Get current chatbot configuration for snapshot
        const beforeSnapshot = await this.getChatbotSnapshot(feedback.chatbot_id);

        // Filter improvements to apply
        const improvementsToApply = feedback.suggested_improvements.filter((_, index) =>
          improvementIds.includes(index.toString())
        );

        if (improvementsToApply.length === 0) {
          throw new FeedbackProcessingError('No valid improvements specified');
        }

        try {
          await this.client.query('BEGIN');

          // Apply each improvement
          const appliedChanges: Record<string, any> = {};

          for (const improvement of improvementsToApply) {
            const changeResult = await this.applyIndividualImprovement(
              feedback.chatbot_id,
              improvement
            );
            appliedChanges[improvement.type] = changeResult;
          }

          // Get after snapshot
          const afterSnapshot = await this.getChatbotSnapshot(feedback.chatbot_id);

          // Update feedback with applied changes
          await this.client.query(`
            UPDATE admin_feedback
            SET status = $1, applied_changes = $2, before_snapshot = $3,
                after_snapshot = $4, applied_at = NOW(), processed_by = $5
            WHERE id = $6
          `, [
            'applied',
            JSON.stringify(appliedChanges),
            JSON.stringify(beforeSnapshot),
            JSON.stringify(afterSnapshot),
            appliedBy,
            feedbackId
          ]);

          await this.client.query('COMMIT');

          // Schedule impact tracking
          this.scheduleImpactTracking(feedbackId, feedback.chatbot_id);

          SentryUtils.addBreadcrumb('Feedback improvements applied', {
            feedback_id: feedbackId,
            chatbot_id: feedback.chatbot_id,
            applied_count: improvementsToApply.length
          });

        } catch (error) {
          await this.client.query('ROLLBACK');
          throw new FeedbackProcessingError(`Failed to apply improvements: ${(error as Error).message}`);
        }
      },
      {
        feedback_id: feedbackId,
        chatbot_id: feedback.chatbot_id,
        improvement_count: improvementIds.length
      }
    );
  }

  /**
   * Track the impact of applied improvements over time
   */
  async trackImpact(feedbackId: string, organizationId: string): Promise<Record<string, any>> {
    const feedback = await this.getFeedbackById(feedbackId, organizationId);
    if (!feedback || feedback.status !== 'applied') {
      throw new FeedbackProcessingError('Feedback not found or improvements not applied');
    }

    const daysSinceApplication = Math.floor(
      (Date.now() - (feedback.applied_at?.getTime() || 0)) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceApplication < 1) {
      return { message: 'Impact tracking requires at least 24 hours after application' };
    }

    // Gather performance metrics before and after
    const beforeMetrics = await this.getPerformanceMetricsForPeriod(
      feedback.chatbot_id,
      feedback.applied_at!,
      -7 // 7 days before
    );

    const afterMetrics = await this.getPerformanceMetricsForPeriod(
      feedback.chatbot_id,
      feedback.applied_at!,
      7 // 7 days after
    );

    const impactMetrics = this.calculateImpactMetrics(beforeMetrics, afterMetrics);

    // Update feedback with impact metrics
    await this.client.query(`
      UPDATE admin_feedback
      SET impact_metrics = $1
      WHERE id = $2
    `, [JSON.stringify(impactMetrics), feedbackId]);

    return impactMetrics;
  }

  /**
   * Get feedback history with filtering options
   */
  async getFeedbackHistory(
    organizationId: string,
    filters: FeedbackFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{
    feedback: IAdminFeedback[];
    pagination: {
      current_page: number;
      total_pages: number;
      total_items: number;
      items_per_page: number;
    };
    summary: {
      total_feedback: number;
      by_status: Record<string, number>;
      by_severity: Record<string, number>;
      by_type: Record<string, number>;
    };
  }> {
    const validatedFilters = FeedbackFiltersSchema.parse(filters);

    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 20;

    const offset = (page - 1) * limit;
    const whereConditions: string[] = ['ci.organization_id = $1'];
    const values: any[] = [organizationId];
    let paramCount = 2;

    // Build filter conditions
    if (validatedFilters.chatbot_id) {
      whereConditions.push(`af.chatbot_id = $${paramCount}`);
      values.push(validatedFilters.chatbot_id);
      paramCount++;
    }

    if (validatedFilters.feedback_type) {
      whereConditions.push(`af.feedback_type = $${paramCount}`);
      values.push(validatedFilters.feedback_type);
      paramCount++;
    }

    if (validatedFilters.severity) {
      whereConditions.push(`af.severity = $${paramCount}`);
      values.push(validatedFilters.severity);
      paramCount++;
    }

    if (validatedFilters.status) {
      whereConditions.push(`af.status = $${paramCount}`);
      values.push(validatedFilters.status);
      paramCount++;
    }

    if (validatedFilters.date_from) {
      whereConditions.push(`af.created_at >= $${paramCount}`);
      values.push(validatedFilters.date_from);
      paramCount++;
    }

    if (validatedFilters.date_to) {
      whereConditions.push(`af.created_at <= $${paramCount}`);
      values.push(validatedFilters.date_to);
      paramCount++;
    }

    if (validatedFilters.created_by) {
      whereConditions.push(`af.created_by = $${paramCount}`);
      values.push(validatedFilters.created_by);
      paramCount++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count and summary
    const summaryQuery = `
      SELECT
        COUNT(*) as total_feedback,
        COUNT(*) FILTER (WHERE af.status = 'pending') as pending,
        COUNT(*) FILTER (WHERE af.status = 'analyzing') as analyzing,
        COUNT(*) FILTER (WHERE af.status = 'completed') as completed,
        COUNT(*) FILTER (WHERE af.status = 'applied') as applied,
        COUNT(*) FILTER (WHERE af.status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE af.severity = 'low') as low_severity,
        COUNT(*) FILTER (WHERE af.severity = 'medium') as medium_severity,
        COUNT(*) FILTER (WHERE af.severity = 'high') as high_severity,
        COUNT(*) FILTER (WHERE af.severity = 'critical') as critical_severity,
        COUNT(*) FILTER (WHERE af.feedback_type = 'accuracy') as accuracy_type,
        COUNT(*) FILTER (WHERE af.feedback_type = 'tone') as tone_type,
        COUNT(*) FILTER (WHERE af.feedback_type = 'completeness') as completeness_type,
        COUNT(*) FILTER (WHERE af.feedback_type = 'relevance') as relevance_type,
        COUNT(*) FILTER (WHERE af.feedback_type = 'other') as other_type
      FROM admin_feedback af
      JOIN chatbot_instances ci ON af.chatbot_id = ci.id
      WHERE ${whereClause}
    `;

    // Get feedback data
    const dataQuery = `
      SELECT af.*, ci.name as chatbot_name
      FROM admin_feedback af
      JOIN chatbot_instances ci ON af.chatbot_id = ci.id
      WHERE ${whereClause}
      ORDER BY af.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    try {
      const [summaryResult, dataResult] = await Promise.all([
        this.client.query(summaryQuery, values),
        this.client.query(dataQuery, [...values, limit, offset])
      ]);

      const summary = summaryResult.rows[0];
      const totalItems = parseInt(summary.total_feedback);
      const totalPages = Math.ceil(totalItems / limit);

      return {
        feedback: dataResult.rows.map(row => this.mapRowToFeedback(row)),
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_items: totalItems,
          items_per_page: limit
        },
        summary: {
          total_feedback: totalItems,
          by_status: {
            pending: parseInt(summary.pending),
            analyzing: parseInt(summary.analyzing),
            completed: parseInt(summary.completed),
            applied: parseInt(summary.applied),
            rejected: parseInt(summary.rejected)
          },
          by_severity: {
            low: parseInt(summary.low_severity),
            medium: parseInt(summary.medium_severity),
            high: parseInt(summary.high_severity),
            critical: parseInt(summary.critical_severity)
          },
          by_type: {
            accuracy: parseInt(summary.accuracy_type),
            tone: parseInt(summary.tone_type),
            completeness: parseInt(summary.completeness_type),
            relevance: parseInt(summary.relevance_type),
            other: parseInt(summary.other_type)
          }
        }
      };
    } catch (error: any) {
      throw new FeedbackProcessingError(`Failed to get feedback history: ${error.message}`);
    }
  }

  // Private helper methods

  private async analyzeFeedbackAsync(feedbackId: string, organizationId: string): Promise<void> {
    try {
      await this.analyzeFeedback(feedbackId, organizationId);
    } catch (error) {
      SentryUtils.captureError(error as Error, {
        operation: 'async_feedback_analysis',
        additionalData: { feedback_id: feedbackId, organization_id: organizationId }
      });
    }
  }

  private async getFeedbackById(feedbackId: string, organizationId: string): Promise<IAdminFeedback | null> {
    const query = `
      SELECT af.* FROM admin_feedback af
      JOIN chatbot_instances ci ON af.chatbot_id = ci.id
      WHERE af.id = $1 AND ci.organization_id = $2
    `;

    const result = await this.client.query(query, [feedbackId, organizationId]);
    return result.rows.length > 0 ? this.mapRowToFeedback(result.rows[0]) : null;
  }

  private async updateFeedbackStatus(feedbackId: string, status: string): Promise<void> {
    await this.client.query(`
      UPDATE admin_feedback
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `, [status, feedbackId]);
  }

  private async gatherProcessingContext(chatbotId: string, organizationId: string): Promise<FeedbackProcessingContext> {
    // Get chatbot configuration
    const chatbotQuery = `
      SELECT * FROM chatbot_instances
      WHERE id = $1 AND organization_id = $2
    `;
    const chatbotResult = await this.client.query(chatbotQuery, [chatbotId, organizationId]);
    const chatbotConfig = chatbotResult.rows[0];

    // Get recent conversations (last 50)
    const conversationsQuery = `
      SELECT cs.*, m.content, m.message_type, m.user_feedback, m.confidence_score
      FROM conversation_sessions cs
      LEFT JOIN messages m ON cs.id = m.session_id
      WHERE cs.chatbot_id = $1 AND cs.start_time >= NOW() - INTERVAL '7 days'
      ORDER BY cs.start_time DESC, m.sequence_number ASC
      LIMIT 200
    `;
    const conversationsResult = await this.client.query(conversationsQuery, [chatbotId]);

    // Get similar feedback
    const similarFeedbackQuery = `
      SELECT * FROM admin_feedback
      WHERE chatbot_id = $1 AND status IN ('completed', 'applied')
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const similarFeedbackResult = await this.client.query(similarFeedbackQuery, [chatbotId]);

    // Get performance metrics
    const metricsQuery = `
      SELECT * FROM daily_metrics
      WHERE chatbot_id = $1 AND metric_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY metric_date DESC
    `;
    const metricsResult = await this.client.query(metricsQuery, [chatbotId]);

    return {
      chatbot_config: chatbotConfig,
      recent_conversations: conversationsResult.rows,
      performance_metrics: metricsResult.rows,
      similar_feedback: similarFeedbackResult.rows.map(row => this.mapRowToFeedback(row))
    };
  }

  private async performLLMAnalysis(
    feedback: IAdminFeedback,
    context: FeedbackProcessingContext
  ): Promise<FeedbackAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(feedback, context);

    try {
      const response = await this.bedrock.send(new InvokeModelCommand({
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 3000,
          temperature: 0.2,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      }));

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const analysisText = responseBody.content[0].text;

      // Parse structured analysis from LLM response
      return this.parseAnalysisResponse(analysisText);
    } catch (error) {
      throw new FeedbackProcessingError(`LLM analysis failed: ${(error as Error).message}`);
    }
  }

  private buildAnalysisPrompt(feedback: IAdminFeedback, context: FeedbackProcessingContext): string {
    return `You are an expert AI chatbot analyst. Analyze the following admin feedback and provide a structured analysis.

FEEDBACK DETAILS:
- Type: ${feedback.feedback_type}
- Severity: ${feedback.severity}
- Text: "${feedback.feedback_text}"
- Context: ${feedback.context || 'None provided'}

CHATBOT CONFIGURATION:
- Model: ${context.chatbot_config?.llm_model}
- System Prompt Length: ${context.chatbot_config?.system_prompt?.length || 0} characters
- RAG Enabled: ${context.chatbot_config?.rag_enabled}
- Temperature: ${context.chatbot_config?.model_config?.temperature || 'N/A'}

RECENT PERFORMANCE:
- Recent conversations: ${context.recent_conversations?.length || 0}
- Similar feedback instances: ${context.similar_feedback?.length || 0}

Please provide a JSON response with the following structure:
{
  "category": "specific category of the issue",
  "severity_assessment": "low|medium|high|critical",
  "root_cause_analysis": "detailed analysis of underlying causes",
  "improvement_areas": ["area1", "area2", "area3"],
  "specific_recommendations": [
    {
      "type": "system_prompt|model_config|rag_settings|knowledge_filter|training_data",
      "description": "what to change",
      "confidence": 0.8,
      "priority": "low|medium|high|critical",
      "estimated_impact": "description of expected impact",
      "implementation_steps": ["step1", "step2"],
      "test_criteria": ["test1", "test2"],
      "rollback_plan": "how to undo if needed"
    }
  ],
  "confidence_score": 0.85,
  "reasoning": "explanation of analysis",
  "potential_risks": ["risk1", "risk2"],
  "success_metrics": ["metric1", "metric2"]
}

Focus on actionable, specific recommendations that directly address the feedback concerns.`;
  }

  private buildImprovementPrompt(analysisResult: FeedbackAnalysisResult, context: FeedbackProcessingContext): string {
    return `Based on the feedback analysis, generate specific implementation details for the recommended improvements.

ANALYSIS SUMMARY:
${JSON.stringify(analysisResult, null, 2)}

CURRENT CHATBOT CONFIGURATION:
${JSON.stringify(context.chatbot_config, null, 2)}

For each recommendation, provide detailed implementation specifics including exact values, configurations, and step-by-step instructions. Return as JSON array of improvements with enhanced implementation details.

Focus on practical, implementable changes with clear before/after values.`;
  }

  private parseAnalysisResponse(analysisText: string): FeedbackAnalysisResult {
    try {
      // Extract JSON from the response (may have additional text)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in analysis response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!analysis.category || !analysis.severity_assessment || !analysis.root_cause_analysis) {
        throw new Error('Missing required analysis fields');
      }

      return analysis as FeedbackAnalysisResult;
    } catch (error) {
      throw new FeedbackProcessingError(`Failed to parse analysis response: ${(error as Error).message}`);
    }
  }

  private validateAndEnhanceImprovements(
    improvements: any[],
    context: FeedbackProcessingContext
  ): FeedbackImprovement[] {
    return improvements.map(improvement => ({
      type: improvement.type || 'system_prompt',
      description: improvement.description || 'No description provided',
      confidence: Math.min(1, Math.max(0, improvement.confidence || 0.5)),
      priority: improvement.priority || 'medium',
      estimated_impact: improvement.estimated_impact || 'Impact assessment pending',
      implementation_steps: Array.isArray(improvement.implementation_steps)
        ? improvement.implementation_steps
        : ['Review and implement manually'],
      test_criteria: Array.isArray(improvement.test_criteria)
        ? improvement.test_criteria
        : ['Monitor performance for 24 hours'],
      rollback_plan: improvement.rollback_plan || 'Restore previous configuration',
      current_value: this.getCurrentValue(improvement.type, context),
      suggested_value: improvement.suggested_value
    }));
  }

  private getCurrentValue(type: string, context: FeedbackProcessingContext): any {
    const config = context.chatbot_config;
    if (!config) return null;

    switch (type) {
      case 'system_prompt':
        return config.system_prompt;
      case 'model_config':
        return config.model_config;
      case 'rag_settings':
        return {
          rag_enabled: config.rag_enabled,
          retrieval_k: config.retrieval_k,
          score_threshold: config.score_threshold,
          context_window: config.context_window
        };
      default:
        return null;
    }
  }

  private async getChatbotSnapshot(chatbotId: string): Promise<Record<string, any>> {
    const query = `
      SELECT system_prompt, model_config, rag_enabled, retrieval_k,
             score_threshold, context_window, performance_metrics
      FROM chatbot_instances
      WHERE id = $1
    `;

    const result = await this.client.query(query, [chatbotId]);
    return result.rows[0] || {};
  }

  private async applyIndividualImprovement(
    chatbotId: string,
    improvement: FeedbackImprovement
  ): Promise<Record<string, any>> {
    const changeLog: Record<string, any> = {
      type: improvement.type,
      applied_at: new Date(),
      previous_value: improvement.current_value,
      new_value: improvement.suggested_value
    };

    switch (improvement.type) {
      case 'system_prompt':
        if (improvement.suggested_value) {
          await this.client.query(`
            UPDATE chatbot_instances
            SET system_prompt = $1, updated_at = NOW()
            WHERE id = $2
          `, [improvement.suggested_value, chatbotId]);
        }
        break;

      case 'model_config':
        if (improvement.suggested_value) {
          await this.client.query(`
            UPDATE chatbot_instances
            SET model_config = $1, updated_at = NOW()
            WHERE id = $2
          `, [JSON.stringify(improvement.suggested_value), chatbotId]);
        }
        break;

      case 'rag_settings':
        if (improvement.suggested_value) {
          const settings = improvement.suggested_value;
          await this.client.query(`
            UPDATE chatbot_instances
            SET rag_enabled = $1, retrieval_k = $2, score_threshold = $3,
                context_window = $4, updated_at = NOW()
            WHERE id = $5
          `, [
            settings.rag_enabled,
            settings.retrieval_k,
            settings.score_threshold,
            settings.context_window,
            chatbotId
          ]);
        }
        break;

      default:
        changeLog.note = 'Manual implementation required';
    }

    return changeLog;
  }

  private scheduleImpactTracking(feedbackId: string, chatbotId: string): void {
    // Schedule impact tracking for 24 hours, 7 days, and 30 days
    // In a production environment, this would use a job queue
    setTimeout(() => {
      this.trackImpact(feedbackId, '').catch(console.error);
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  private async getPerformanceMetricsForPeriod(
    chatbotId: string,
    referenceDate: Date,
    dayOffset: number
  ): Promise<Record<string, any>> {
    const startDate = new Date(referenceDate);
    const endDate = new Date(referenceDate);

    if (dayOffset < 0) {
      startDate.setDate(startDate.getDate() + dayOffset);
    } else {
      endDate.setDate(endDate.getDate() + dayOffset);
    }

    const query = `
      SELECT
        AVG(avg_response_time_ms) as avg_response_time,
        AVG(avg_user_satisfaction) as avg_satisfaction,
        SUM(total_messages) as total_messages,
        AVG(successful_responses_ratio) as success_rate
      FROM daily_metrics
      WHERE chatbot_id = $1
      AND metric_date BETWEEN $2 AND $3
    `;

    const result = await this.client.query(query, [chatbotId, startDate, endDate]);
    return result.rows[0] || {};
  }

  private calculateImpactMetrics(beforeMetrics: Record<string, any>, afterMetrics: Record<string, any>): Record<string, any> {
    const calculateChange = (before: number, after: number) => {
      if (!before || before === 0) return null;
      return ((after - before) / before) * 100;
    };

    return {
      response_time_change: calculateChange(beforeMetrics.avg_response_time, afterMetrics.avg_response_time),
      satisfaction_change: calculateChange(beforeMetrics.avg_satisfaction, afterMetrics.avg_satisfaction),
      success_rate_change: calculateChange(beforeMetrics.success_rate, afterMetrics.success_rate),
      message_volume_change: calculateChange(beforeMetrics.total_messages, afterMetrics.total_messages),
      calculated_at: new Date(),
      period_analyzed: '7_days_before_after'
    };
  }

  private mapRowToFeedback(row: any): IAdminFeedback {
    return {
      id: row.id,
      chatbot_id: row.chatbot_id,
      message_id: row.message_id,
      feedback_text: row.feedback_text,
      feedback_type: row.feedback_type,
      severity: row.severity,
      context: row.context,
      status: row.status,
      analysis_results: row.analysis_results || {},
      suggested_improvements: row.suggested_improvements || [],
      applied_changes: row.applied_changes || {},
      before_snapshot: row.before_snapshot || {},
      after_snapshot: row.after_snapshot || {},
      impact_metrics: row.impact_metrics || {},
      created_at: new Date(row.created_at),
      processed_at: row.processed_at ? new Date(row.processed_at) : undefined,
      applied_at: row.applied_at ? new Date(row.applied_at) : undefined,
      created_by: row.created_by,
      processed_by: row.processed_by
    };
  }
}

export default FeedbackService;