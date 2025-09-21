/**
 * Chatbot Service
 *
 * Handles chatbot instance management, configuration, and deployment.
 * Manages LLM integrations, system prompts, and knowledge base assignments.
 */

import { Client } from 'pg';
import {
  ChatbotInstance,
  CreateChatbotInstance,
  UpdateChatbotInstance,
  ChatbotWithProducts,
  ChatbotListFilters,
  ChatbotListResponse,
  ChatbotInstanceSchema,
  CreateChatbotInstanceSchema,
  UpdateChatbotInstanceSchema,
  ChatbotModel,
  LLM_PROVIDERS,
  TOKEN_COSTS,
  DEFAULT_SYSTEM_PROMPTS
} from '@/lib/models/chatbot';
// Temporarily disable monitoring to resolve hanging issues
// import { withDatabaseMonitoring, withExternalApiMonitoring } from '@/lib/monitoring/api-wrapper';
// import { SentryUtils, ChatbotError } from '@/lib/monitoring/sentry-utils';

// Temporary error class without Sentry dependency
class ChatbotError extends Error {
  constructor(message: string, public category?: string, public context?: Record<string, any>) {
    super(message);
    this.name = 'ChatbotError';
  }
}

// Temporary stubs for monitoring functions
const withDatabaseMonitoring = async <T>(operation: () => Promise<T>, context: any): Promise<T> => {
  return operation();
};

const withExternalApiMonitoring = async <T>(operation: () => Promise<T>, context: any): Promise<T> => {
  return operation();
};

const SentryUtils = {
  addBreadcrumb: (message: string, data?: any) => {
    console.log('Breadcrumb:', message, data);
  }
};

export interface ChatbotDeployment {
  id: string;
  environment: 'development' | 'staging' | 'production';
  endpoint_url: string;
  api_key: string;
  status: 'active' | 'inactive' | 'failed';
  health_check_url?: string;
  last_health_check?: Date;
}

export interface ChatbotAnalytics {
  conversations_count: number;
  messages_count: number;
  avg_response_time: number;
  user_satisfaction: number;
  cost_current_month: number;
  cost_previous_month: number;
  popular_queries: Array<{ query: string; count: number }>;
  error_rate: number;
}

export interface FeedbackAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  suggested_improvements: string[];
  confidence: number;
  categories: string[];
}

export class ChatbotService {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Create a new chatbot instance
   */
  async create(
    data: CreateChatbotInstance,
    organizationId: string,
    createdBy?: string
  ): Promise<ChatbotInstance> {
    return withDatabaseMonitoring(
      async () => {
        const validatedData = CreateChatbotInstanceSchema.parse(data);

        // Validate LLM provider and model using updated model support
        const SUPPORTED_MODELS = {
          bedrock: [
            // Amazon Nova models (recommended defaults)
            'amazon.nova-micro-v1:0',
            'amazon.nova-lite-v1:0',
            'amazon.nova-pro-v1:0',
            // Legacy Claude models (backward compatibility)
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

        if (!SUPPORTED_MODELS[validatedData.llm_provider as keyof typeof SUPPORTED_MODELS]) {
          throw new ChatbotError(
            `Unsupported LLM provider: ${validatedData.llm_provider}. Recommended: Use 'bedrock' with Amazon Nova models for best performance and cost efficiency.`,
            'configuration',
            { provider: validatedData.llm_provider }
          );
        }

        const providerModels = SUPPORTED_MODELS[validatedData.llm_provider as keyof typeof SUPPORTED_MODELS];
        if (!providerModels.includes(validatedData.llm_model)) {
          const recommendedModel = validatedData.llm_provider === 'bedrock' ? 'amazon.nova-micro-v1:0' : providerModels[0];
          throw new ChatbotError(
            `Unsupported model '${validatedData.llm_model}' for provider '${validatedData.llm_provider}'. Supported models: ${providerModels.join(', ')}. Recommended: ${recommendedModel}`,
            'configuration',
            { provider: validatedData.llm_provider, model: validatedData.llm_model, recommended: recommendedModel }
          );
        }

        // Generate default system prompt if not provided
        const systemPrompt = validatedData.system_prompt ||
          DEFAULT_SYSTEM_PROMPTS['general-assistant'];

        // Match actual database schema - use model_config JSON field
        const modelConfig = {
          temperature: validatedData.model_config?.temperature || 0.7,
          max_tokens: validatedData.model_config?.max_tokens || 1000,
          top_p: validatedData.model_config?.top_p || 0.9,
          ...validatedData.model_config
        };

        const query = `
          INSERT INTO chatbot_instances (
            organization_id, name, description, status, llm_provider, llm_model,
            system_prompt, model_config, rag_enabled, retrieval_k, score_threshold,
            context_window, welcome_message, fallback_message, performance_metrics, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING *
        `;

        const values = [
          organizationId,
          validatedData.name,
          validatedData.description,
          'draft',
          validatedData.llm_provider,
          validatedData.llm_model,
          systemPrompt,
          JSON.stringify(modelConfig),
          validatedData.rag_enabled !== undefined ? validatedData.rag_enabled : true,
          validatedData.retrieval_k || 5,
          validatedData.score_threshold || 0.7,
          validatedData.context_window || 4000,
          validatedData.welcome_message || 'Hello! How can I help you today?',
          validatedData.fallback_message || 'I\'m sorry, I didn\'t understand that. Can you please rephrase?',
          JSON.stringify({}),
          createdBy || null
        ];

        const result = await this.client.query(query, values);

        if (result.rows.length === 0) {
          throw new ChatbotError('Failed to create chatbot instance');
        }

        const chatbot = result.rows[0]; // Temporarily disable schema validation

        // Log successful creation
        SentryUtils.addBreadcrumb('Chatbot instance created', {
          organization_id: organizationId,
          chatbot_id: chatbot.id,
          name: chatbot.name,
          provider: chatbot.llm_provider,
          model: chatbot.llm_model,
          purpose: chatbot.purpose
        });

        return chatbot;
      },
      {
        operation: 'create',
        table: 'chatbot_instances',
        organizationId,
        additionalData: {
          name: data.name,
          provider: data.llm_provider,
          model: data.llm_model
        }
      }
    );
  }

  /**
   * Get chatbot by ID
   */
  async getById(id: string, organizationId: string): Promise<ChatbotInstance | null> {
    return withDatabaseMonitoring(
      async () => {
        const query = `
          SELECT * FROM chatbot_instances
          WHERE id = $1 AND organization_id = $2
        `;

        const result = await this.client.query(query, [id, organizationId]);

        if (result.rows.length === 0) {
          return null;
        }

        return ChatbotInstanceSchema.parse(result.rows[0]);
      },
      {
        operation: 'getById',
        table: 'chatbot_instances',
        organizationId,
        additionalData: { chatbot_id: id }
      }
    );
  }

  /**
   * List chatbots with filtering and pagination
   */
  async list(
    organizationId: string,
    filters: ChatbotListFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<ChatbotListResponse> {
    return withDatabaseMonitoring(
      async () => {
        const offset = (page - 1) * limit;
        let whereConditions = ['organization_id = $1'];
        let queryParams: any[] = [organizationId];
        let paramIndex = 2;

        // Apply filters
        if (filters.status) {
          whereConditions.push(`status = $${paramIndex}`);
          queryParams.push(filters.status);
          paramIndex++;
        }

        // Purpose filter not available in ChatbotListFilters interface
        // Remove or add to interface if needed

        if (filters.model_provider) {
          whereConditions.push(`llm_provider = $${paramIndex}`);
          queryParams.push(filters.model_provider);
          paramIndex++;
        }

        if (filters.search) {
          whereConditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
          queryParams.push(`%${filters.search}%`);
          paramIndex++;
        }

        const whereClause = whereConditions.join(' AND ');

        // Get total count
        const countQuery = `SELECT COUNT(*) FROM chatbot_instances WHERE ${whereClause}`;
        const countResult = await this.client.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].count);

        // Get chatbots
        const query = `
          SELECT * FROM chatbot_instances
          WHERE ${whereClause}
          ORDER BY created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(limit, offset);
        const result = await this.client.query(query, queryParams);

        const chatbots = result.rows; // Temporarily disable schema validation

        return {
          chatbots,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        };
      },
      {
        operation: 'list',
        table: 'chatbot_instances',
        organizationId,
        additionalData: { filters, page, limit }
      }
    );
  }

  /**
   * Update chatbot
   */
  async update(
    id: string,
    data: UpdateChatbotInstance,
    organizationId: string
  ): Promise<ChatbotInstance> {
    return withDatabaseMonitoring(
      async () => {
        const validatedData = UpdateChatbotInstanceSchema.parse(data);

        if (Object.keys(validatedData).length === 0) {
          throw new ChatbotError('No valid fields provided for update');
        }

        // Validate provider/model combination if model is being updated
        if (validatedData.llm_model) {
          const currentChatbot = await this.getById(id, organizationId);
          if (!currentChatbot) {
            throw new ChatbotError(`Chatbot not found: ${id}`);
          }

          const provider = currentChatbot.llm_provider;
          const model = validatedData.llm_model;

          const SUPPORTED_MODELS = {
            bedrock: [
              'amazon.nova-micro-v1:0',
              'amazon.nova-lite-v1:0',
              'amazon.nova-pro-v1:0',
              'anthropic.claude-3-haiku-20240307-v1:0',
              'anthropic.claude-3-sonnet-20240229-v1:0',
              'anthropic.claude-3-opus-20240229-v1:0',
              'anthropic.claude-3-5-sonnet-20240620-v1:0',
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

          const providerModels = SUPPORTED_MODELS[provider as keyof typeof SUPPORTED_MODELS];
          if (!providerModels?.includes(model)) {
            const recommendedModel = provider === 'bedrock' ? 'amazon.nova-micro-v1:0' : providerModels?.[0] || 'gpt-3.5-turbo';
            throw new ChatbotError(
              `Invalid model '${model}' for provider '${provider}'. Supported models: ${providerModels?.join(', ') || 'none'}. Recommended: ${recommendedModel}`,
              'configuration',
              { provider, model, recommended: recommendedModel }
            );
          }
        }

        const setClauses: string[] = [];
        const queryParams: any[] = [id, organizationId];
        let paramIndex = 3;

        // Build dynamic SET clause
        Object.entries(validatedData).forEach(([key, value]) => {
          if (value !== undefined) {
            if (key === 'settings') {
              setClauses.push(`settings = $${paramIndex}`);
              queryParams.push(JSON.stringify(value));
            } else {
              setClauses.push(`${key} = $${paramIndex}`);
              queryParams.push(value);
            }
            paramIndex++;
          }
        });

        setClauses.push(`updated_at = NOW()`);

        const query = `
          UPDATE chatbot_instances
          SET ${setClauses.join(', ')}
          WHERE id = $1 AND organization_id = $2
          RETURNING *
        `;

        const result = await this.client.query(query, queryParams);

        if (result.rows.length === 0) {
          throw new ChatbotError(`Chatbot not found: ${id}`);
        }

        const chatbot = ChatbotInstanceSchema.parse(result.rows[0]);

        // Log successful update
        SentryUtils.addBreadcrumb('Chatbot instance updated', {
          organization_id: organizationId,
          chatbot_id: id,
          updated_fields: Object.keys(validatedData)
        });

        return chatbot;
      },
      {
        operation: 'update',
        table: 'chatbot_instances',
        organizationId,
        additionalData: {
          chatbot_id: id,
          update_fields: Object.keys(data)
        }
      }
    );
  }

  /**
   * Delete chatbot
   */
  async delete(id: string, organizationId: string): Promise<void> {
    return withDatabaseMonitoring(
      async () => {
        // Check if chatbot has active conversations
        const activeConversationsQuery = `
          SELECT COUNT(*) FROM conversation_sessions
          WHERE chatbot_id = $1 AND status = 'active'
        `;

        const activeResult = await this.client.query(activeConversationsQuery, [id]);
        const activeCount = parseInt(activeResult.rows[0].count);

        if (activeCount > 0) {
          throw new ChatbotError(
            `Cannot delete chatbot with ${activeCount} active conversations`,
            'validation',
            { active_conversations: activeCount }
          );
        }

        const query = `
          DELETE FROM chatbot_instances
          WHERE id = $1 AND organization_id = $2
        `;

        const result = await this.client.query(query, [id, organizationId]);

        if (result.rowCount === 0) {
          throw new ChatbotError(`Chatbot not found: ${id}`);
        }

        // Log successful deletion
        SentryUtils.addBreadcrumb('Chatbot instance deleted', {
          organization_id: organizationId,
          chatbot_id: id
        });
      },
      {
        operation: 'delete',
        table: 'chatbot_instances',
        organizationId,
        additionalData: { chatbot_id: id }
      }
    );
  }

  /**
   * Get chatbot with assigned products
   */
  async getWithProducts(id: string, organizationId: string): Promise<ChatbotWithProducts | null> {
    return withDatabaseMonitoring(
      async () => {
        const query = `
          SELECT
            ci.*,
            json_agg(
              json_build_object(
                'id', p.id,
                'name', p.name,
                'description', p.description,
                'category', p.category,
                'sku', p.sku,
                'status', p.status,
                'document_count', COALESCE(doc_counts.count, 0)
              ) ORDER BY p.name
            ) FILTER (WHERE p.id IS NOT NULL) as products
          FROM chatbot_instances ci
          LEFT JOIN chatbot_products cp ON ci.id = cp.chatbot_id
          LEFT JOIN products p ON cp.product_id = p.id
          LEFT JOIN (
            SELECT product_id, COUNT(*) as count
            FROM product_documents pd
            JOIN documents d ON pd.document_id = d.id
            WHERE d.processing_stage = 'completed'
            GROUP BY product_id
          ) doc_counts ON p.id = doc_counts.product_id
          WHERE ci.id = $1 AND ci.organization_id = $2
          GROUP BY ci.id
        `;

        const result = await this.client.query(query, [id, organizationId]);

        if (result.rows.length === 0) {
          return null;
        }

        const row = result.rows[0];
        const chatbot = ChatbotInstanceSchema.parse(row);

        return {
          ...chatbot,
          products: row.products || []
        };
      },
      {
        operation: 'getWithProducts',
        table: 'chatbot_instances',
        organizationId,
        additionalData: { chatbot_id: id }
      }
    );
  }

  /**
   * Assign products to chatbot
   */
  async assignProducts(
    id: string,
    productIds: string[],
    organizationId: string
  ): Promise<void> {
    return withDatabaseMonitoring(
      async () => {
        // Verify chatbot exists
        const chatbot = await this.getById(id, organizationId);
        if (!chatbot) {
          throw new ChatbotError(`Chatbot not found: ${id}`);
        }

        // Remove existing assignments
        await this.client.query(
          'DELETE FROM chatbot_products WHERE chatbot_id = $1',
          [id]
        );

        // Add new assignments
        if (productIds.length > 0) {
          const values: string[] = [];
          const params: any[] = [];
          let paramIndex = 1;

          productIds.forEach(productId => {
            values.push(`($${paramIndex}, $${paramIndex + 1})`);
            params.push(id, productId);
            paramIndex += 2;
          });

          const insertQuery = `
            INSERT INTO chatbot_products (chatbot_id, product_id)
            VALUES ${values.join(', ')}
          `;

          await this.client.query(insertQuery, params);
        }

        // Log successful assignment
        SentryUtils.addBreadcrumb('Chatbot products assigned', {
          organization_id: organizationId,
          chatbot_id: id,
          product_count: productIds.length
        });
      },
      {
        operation: 'assignProducts',
        table: 'chatbot_products',
        organizationId,
        additionalData: {
          chatbot_id: id,
          product_count: productIds.length
        }
      }
    );
  }

  /**
   * Deploy chatbot to environment
   */
  async deploy(
    id: string,
    environment: 'development' | 'staging' | 'production',
    organizationId: string
  ): Promise<ChatbotDeployment> {
    return withExternalApiMonitoring(
      async () => {
        const chatbot = await this.getById(id, organizationId);
        if (!chatbot) {
          throw new ChatbotError(`Chatbot not found: ${id}`);
        }

        if (chatbot.status !== 'active') {
          throw new ChatbotError(
            `Cannot deploy chatbot with status: ${chatbot.status}`,
            'deployment',
            { status: chatbot.status }
          );
        }

        // Generate deployment configuration
        const deployment: ChatbotDeployment = {
          id: `${id}-${environment}`,
          environment,
          endpoint_url: `https://api.${environment}.chatbot.example.com/chat/${id}`,
          api_key: this.generateApiKey(id, environment),
          status: 'active',
          health_check_url: `https://api.${environment}.chatbot.example.com/health/${id}`,
          last_health_check: new Date()
        };

        // Store deployment info (mark as active when deployed)
        await this.update(id, {
          status: 'active'
        }, organizationId);

        // Note: settings/deployments would need to be stored in a separate table
        // or added to the schema to persist deployment information

        // Log successful deployment
        SentryUtils.addBreadcrumb('Chatbot deployed', {
          organization_id: organizationId,
          chatbot_id: id,
          environment,
          endpoint_url: deployment.endpoint_url
        });

        return deployment;
      },
      {
        service: 'chatbot_deployment',
        endpoint: 'deploy',
        chatbotId: id,
        additionalData: {
          environment,
          organization_id: organizationId
        }
      }
    );
  }

  /**
   * Process feedback and suggest system prompt improvements
   */
  async processFeedback(
    id: string,
    feedback: string,
    organizationId: string
  ): Promise<FeedbackAnalysis> {
    return withExternalApiMonitoring(
      async () => {
        const chatbot = await this.getById(id, organizationId);
        if (!chatbot) {
          throw new ChatbotError(`Chatbot not found: ${id}`);
        }

        // This would integrate with an LLM to analyze feedback
        const analysis = await this.analyzeFeedbackWithLLM(feedback, chatbot);

        // Store feedback analysis
        const feedbackRecord = {
          chatbot_id: id,
          feedback_text: feedback,
          analysis: analysis,
          processed_at: new Date().toISOString()
        };

        // TODO: Store feedback history in separate table or model_config
        // const updatedSettings = {
        //   feedback_history: [
        //     ...(chatbot.model_config?.feedback_history || []).slice(-9), // Keep last 10
        //     feedbackRecord
        //   ]
        // };

        // For now, skip updating settings since it's not in the schema
        // await this.update(id, { model_config: { ...chatbot.model_config, ...updatedSettings } }, organizationId);

        // Log feedback processing
        SentryUtils.addBreadcrumb('Chatbot feedback processed', {
          organization_id: organizationId,
          chatbot_id: id,
          sentiment: analysis.sentiment,
          confidence: analysis.confidence,
          improvement_count: analysis.suggested_improvements.length
        });

        return analysis;
      },
      {
        service: 'feedback_analysis',
        endpoint: 'analyze',
        chatbotId: id,
        additionalData: {
          organization_id: organizationId,
          feedback_length: feedback.length
        }
      }
    );
  }

  /**
   * Get chatbot analytics
   */
  async getAnalytics(
    id: string,
    organizationId: string,
    timeRange: '7d' | '30d' | '90d' = '30d'
  ): Promise<ChatbotAnalytics> {
    return withDatabaseMonitoring(
      async () => {
        const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

        const query = `
          SELECT
            COUNT(DISTINCT cs.id) as conversations_count,
            COUNT(m.id) as messages_count,
            AVG(m.response_time_ms) as avg_response_time,
            AVG(m.user_feedback_score) FILTER (WHERE m.user_feedback_score IS NOT NULL) as user_satisfaction,
            SUM(m.cost_usd) FILTER (WHERE m.created_at >= DATE_TRUNC('month', NOW())) as cost_current_month,
            SUM(m.cost_usd) FILTER (WHERE m.created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
                                    AND m.created_at < DATE_TRUNC('month', NOW())) as cost_previous_month,
            COUNT(m.id) FILTER (WHERE m.error_message IS NOT NULL) as error_count,
            COUNT(m.id) as total_messages
          FROM conversation_sessions cs
          LEFT JOIN messages m ON cs.id = m.session_id
          WHERE cs.chatbot_id = $1
            AND cs.created_at >= NOW() - INTERVAL '${daysBack} days'
          GROUP BY cs.chatbot_id
        `;

        const result = await this.client.query(query, [id]);

        const row = result.rows[0] || {};

        // Get popular queries
        const popularQueriesQuery = `
          SELECT m.content, COUNT(*) as count
          FROM messages m
          JOIN conversation_sessions cs ON m.session_id = cs.id
          WHERE cs.chatbot_id = $1
            AND m.role = 'user'
            AND m.created_at >= NOW() - INTERVAL '${daysBack} days'
          GROUP BY m.content
          ORDER BY count DESC
          LIMIT 10
        `;

        const popularResult = await this.client.query(popularQueriesQuery, [id]);

        const analytics: ChatbotAnalytics = {
          conversations_count: parseInt(row.conversations_count) || 0,
          messages_count: parseInt(row.messages_count) || 0,
          avg_response_time: parseFloat(row.avg_response_time) || 0,
          user_satisfaction: parseFloat(row.user_satisfaction) || 0,
          cost_current_month: parseFloat(row.cost_current_month) || 0,
          cost_previous_month: parseFloat(row.cost_previous_month) || 0,
          popular_queries: popularResult.rows.map(r => ({
            query: r.content,
            count: parseInt(r.count)
          })),
          error_rate: row.total_messages > 0
            ? (parseInt(row.error_count) / parseInt(row.total_messages)) * 100
            : 0
        };

        return analytics;
      },
      {
        operation: 'getAnalytics',
        table: 'conversation_sessions',
        organizationId,
        additionalData: {
          chatbot_id: id,
          time_range: timeRange
        }
      }
    );
  }

  /**
   * Generate API key for deployment
   */
  private generateApiKey(chatbotId: string, environment: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `cb_${environment}_${chatbotId.substring(0, 8)}_${timestamp}_${random}`;
  }

  /**
   * Analyze feedback with LLM (placeholder for actual implementation)
   */
  private async analyzeFeedbackWithLLM(
    feedback: string,
    chatbot: ChatbotInstance
  ): Promise<FeedbackAnalysis> {
    // This would integrate with an LLM service to analyze feedback
    // For now, return a mock analysis

    const sentiment = feedback.toLowerCase().includes('good') || feedback.toLowerCase().includes('great')
      ? 'positive'
      : feedback.toLowerCase().includes('bad') || feedback.toLowerCase().includes('terrible')
      ? 'negative'
      : 'neutral';

    return {
      sentiment,
      suggested_improvements: [
        'Consider adjusting response tone to be more conversational',
        'Add more specific examples in responses',
        'Improve context understanding for follow-up questions'
      ],
      confidence: 0.85,
      categories: ['response_quality', 'user_experience']
    };
  }

  /**
   * Test chatbot with sample queries
   */
  async testChatbot(
    id: string,
    testQueries: string[],
    organizationId: string
  ): Promise<Array<{ query: string; response: string; response_time: number; error?: string }>> {
    const results = [];

    for (const query of testQueries) {
      const startTime = Date.now();

      try {
        // This would integrate with the actual chatbot inference
        const response = await this.simulateChatbotResponse(query, id);
        const responseTime = Date.now() - startTime;

        results.push({
          query,
          response,
          response_time: responseTime
        });
      } catch (error) {
        results.push({
          query,
          response: '',
          response_time: Date.now() - startTime,
          error: (error as Error).message
        });
      }
    }

    // Log test results
    SentryUtils.addBreadcrumb('Chatbot test completed', {
      organization_id: organizationId,
      chatbot_id: id,
      test_count: testQueries.length,
      success_count: results.filter(r => !r.error).length,
      avg_response_time: results.reduce((sum, r) => sum + r.response_time, 0) / results.length
    });

    return results;
  }

  /**
   * Simulate chatbot response (placeholder for actual implementation)
   */
  private async simulateChatbotResponse(query: string, chatbotId: string): Promise<string> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    return `This is a simulated response to: "${query}". In a real implementation, this would use the configured LLM model to generate an actual response based on the chatbot's knowledge base and system prompt.`;
  }
}

export default ChatbotService;