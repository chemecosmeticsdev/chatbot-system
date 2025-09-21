import * as Sentry from '@sentry/nextjs';

// Custom error types for better categorization
export class ChatbotError extends Error {
  constructor(message: string, public category: string, public context?: Record<string, any>) {
    super(message);
    this.name = 'ChatbotError';
  }
}

export class VectorSearchError extends ChatbotError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'vector_search', context);
    this.name = 'VectorSearchError';
  }
}

export class LLMError extends ChatbotError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'llm_integration', context);
    this.name = 'LLMError';
  }
}

export class DocumentProcessingError extends ChatbotError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'document_processing', context);
    this.name = 'DocumentProcessingError';
  }
}

export class ConversationError extends ChatbotError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'conversation', context);
    this.name = 'ConversationError';
  }
}

export class IntegrationError extends ChatbotError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'integration', context);
    this.name = 'IntegrationError';
  }
}

// Sentry utilities for chatbot system
export class SentryUtils {
  // Capture chatbot-specific errors with context
  static captureError(error: Error, context?: {
    chatbotId?: string;
    sessionId?: string;
    userId?: string;
    organizationId?: string;
    messageId?: string;
    operation?: string;
    additionalData?: Record<string, any>;
  }) {
    return Sentry.withScope((scope) => {
      // Set user context
      if (context?.userId) {
        scope.setUser({ id: context.userId });
      }

      // Set tags for better filtering
      if (context?.chatbotId) scope.setTag('chatbot_id', context.chatbotId);
      if (context?.sessionId) scope.setTag('session_id', context.sessionId);
      if (context?.organizationId) scope.setTag('organization_id', context.organizationId);
      if (context?.operation) scope.setTag('operation', context.operation);

      // Set context for detailed debugging
      scope.setContext('chatbot_error', {
        chatbot_id: context?.chatbotId,
        session_id: context?.sessionId,
        message_id: context?.messageId,
        operation: context?.operation,
        timestamp: new Date().toISOString(),
        ...context?.additionalData
      });

      // Set error fingerprint for better grouping
      if (error instanceof ChatbotError) {
        scope.setFingerprint([error.category, error.message]);
        scope.setTag('error_category', error.category);
        if (error.context) {
          scope.setContext('error_specific_context', error.context);
        }
      }

      return Sentry.captureException(error);
    });
  }

  // Capture performance metrics for chatbot operations
  static capturePerformance(operationName: string, context?: {
    chatbotId?: string;
    sessionId?: string;
    duration?: number;
    metadata?: Record<string, any>;
  }) {
    return Sentry.withScope((scope) => {
      scope.setTag('operation_type', 'performance');
      scope.setTag('operation_name', operationName);

      if (context?.chatbotId) scope.setTag('chatbot_id', context.chatbotId);
      if (context?.sessionId) scope.setTag('session_id', context.sessionId);

      scope.setContext('performance_context', {
        operation: operationName,
        duration_ms: context?.duration,
        timestamp: new Date().toISOString(),
        ...context?.metadata
      });

      return Sentry.addBreadcrumb({
        message: `Performance: ${operationName}`,
        level: 'info',
        data: {
          duration_ms: context?.duration,
          ...context?.metadata
        }
      });
    });
  }

  // Capture LLM API interactions
  static captureLLMInteraction(context: {
    chatbotId: string;
    sessionId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    responseTime: number;
    success: boolean;
    errorMessage?: string;
  }) {
    return Sentry.withScope((scope) => {
      scope.setTag('interaction_type', 'llm_api');
      scope.setTag('chatbot_id', context.chatbotId);
      scope.setTag('session_id', context.sessionId);
      scope.setTag('llm_model', context.model);
      scope.setTag('llm_success', context.success.toString());

      scope.setContext('llm_interaction', {
        model: context.model,
        input_tokens: context.inputTokens,
        output_tokens: context.outputTokens,
        total_tokens: context.inputTokens + context.outputTokens,
        response_time_ms: context.responseTime,
        success: context.success,
        error_message: context.errorMessage,
        timestamp: new Date().toISOString()
      });

      if (context.success) {
        return Sentry.addBreadcrumb({
          message: `LLM API Success: ${context.model}`,
          level: 'info',
          data: {
            model: context.model,
            tokens: context.inputTokens + context.outputTokens,
            response_time_ms: context.responseTime
          }
        });
      } else {
        return this.captureError(
          new LLMError(context.errorMessage || 'LLM API failed'),
          {
            chatbotId: context.chatbotId,
            sessionId: context.sessionId,
            operation: 'llm_api_call',
            additionalData: {
              model: context.model,
              input_tokens: context.inputTokens,
              response_time_ms: context.responseTime
            }
          }
        );
      }
    });
  }

  // Capture vector search operations
  static captureVectorSearch(context: {
    chatbotId: string;
    sessionId: string;
    query: string;
    resultsCount: number;
    searchTime: number;
    success: boolean;
    errorMessage?: string;
  }) {
    return Sentry.withScope((scope) => {
      scope.setTag('operation_type', 'vector_search');
      scope.setTag('chatbot_id', context.chatbotId);
      scope.setTag('session_id', context.sessionId);
      scope.setTag('vector_search_success', context.success.toString());

      scope.setContext('vector_search', {
        query_length: context.query.length,
        results_count: context.resultsCount,
        search_time_ms: context.searchTime,
        success: context.success,
        error_message: context.errorMessage,
        timestamp: new Date().toISOString()
      });

      if (context.success) {
        return Sentry.addBreadcrumb({
          message: `Vector Search Success`,
          level: 'info',
          data: {
            results_count: context.resultsCount,
            search_time_ms: context.searchTime
          }
        });
      } else {
        return this.captureError(
          new VectorSearchError(context.errorMessage || 'Vector search failed'),
          {
            chatbotId: context.chatbotId,
            sessionId: context.sessionId,
            operation: 'vector_search',
            additionalData: {
              query_length: context.query.length,
              search_time_ms: context.searchTime
            }
          }
        );
      }
    });
  }

  // Capture document processing events
  static captureDocumentProcessing(context: {
    organizationId: string;
    productId: string;
    documentId: string;
    stage: 'upload' | 'virus_scan' | 'ocr' | 'text_extraction' | 'chunking' | 'embedding' | 'indexing' | 'validation';
    success: boolean;
    duration?: number;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }) {
    return Sentry.withScope((scope) => {
      scope.setTag('operation_type', 'document_processing');
      scope.setTag('organization_id', context.organizationId);
      scope.setTag('product_id', context.productId);
      scope.setTag('document_id', context.documentId);
      scope.setTag('processing_stage', context.stage);
      scope.setTag('processing_success', context.success.toString());

      scope.setContext('document_processing', {
        stage: context.stage,
        duration_ms: context.duration,
        success: context.success,
        error_message: context.errorMessage,
        timestamp: new Date().toISOString(),
        ...context.metadata
      });

      if (context.success) {
        return Sentry.addBreadcrumb({
          message: `Document Processing: ${context.stage} completed`,
          level: 'info',
          data: {
            stage: context.stage,
            duration_ms: context.duration,
            document_id: context.documentId
          }
        });
      } else {
        return this.captureError(
          new DocumentProcessingError(
            context.errorMessage || `Document processing failed at ${context.stage}`,
            { stage: context.stage, ...context.metadata }
          ),
          {
            organizationId: context.organizationId,
            operation: `document_${context.stage}`,
            additionalData: {
              product_id: context.productId,
              document_id: context.documentId,
              stage: context.stage,
              duration_ms: context.duration
            }
          }
        );
      }
    });
  }

  // Capture conversation events
  static captureConversation(context: {
    chatbotId: string;
    sessionId: string;
    messageId: string;
    messageType: 'user_message' | 'bot_response' | 'system_message';
    success: boolean;
    processingTime?: number;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }) {
    return Sentry.withScope((scope) => {
      scope.setTag('operation_type', 'conversation');
      scope.setTag('chatbot_id', context.chatbotId);
      scope.setTag('session_id', context.sessionId);
      scope.setTag('message_type', context.messageType);
      scope.setTag('conversation_success', context.success.toString());

      scope.setContext('conversation', {
        message_id: context.messageId,
        message_type: context.messageType,
        processing_time_ms: context.processingTime,
        success: context.success,
        error_message: context.errorMessage,
        timestamp: new Date().toISOString(),
        ...context.metadata
      });

      if (context.success) {
        return Sentry.addBreadcrumb({
          message: `Conversation: ${context.messageType}`,
          level: 'info',
          data: {
            message_type: context.messageType,
            processing_time_ms: context.processingTime,
            message_id: context.messageId
          }
        });
      } else {
        return this.captureError(
          new ConversationError(
            context.errorMessage || `Conversation error in ${context.messageType}`,
            { message_type: context.messageType, ...context.metadata }
          ),
          {
            chatbotId: context.chatbotId,
            sessionId: context.sessionId,
            messageId: context.messageId,
            operation: `conversation_${context.messageType}`,
            additionalData: {
              processing_time_ms: context.processingTime
            }
          }
        );
      }
    });
  }

  // Set user context for the session
  static setUserContext(user: {
    id: string;
    organizationId?: string;
    email?: string;
    username?: string;
  }) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username
    });

    if (user.organizationId) {
      Sentry.setTag('organization_id', user.organizationId);
    }
  }

  // Clear user context (e.g., on logout)
  static clearUserContext() {
    Sentry.setUser(null);
  }

  // Add breadcrumb for debugging
  static addBreadcrumb(message: string, data?: Record<string, any>, level: 'debug' | 'info' | 'warning' | 'error' = 'info') {
    Sentry.addBreadcrumb({
      message,
      level,
      data,
      timestamp: Date.now() / 1000
    });
  }

  // Start a performance transaction (legacy compatibility)
  static startTransaction(name: string, description?: string) {
    // Return a mock transaction object for compatibility
    return {
      setStatus: (status: string) => {},
      setData: (key: string, value: any) => {},
      finish: () => {}
    };
  }

  // Wrap async operations with performance monitoring
  static async withPerformanceMonitoring<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const transaction = this.startTransaction(operationName);
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      transaction.setStatus('ok');
      this.capturePerformance(operationName, {
        duration,
        metadata: context
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      transaction.setStatus('internal_error');
      this.captureError(error as Error, {
        operation: operationName,
        additionalData: {
          duration_ms: duration,
          ...context
        }
      });

      throw error;
    } finally {
      transaction.finish();
    }
  }

  // Deployment validation specific monitoring
  static captureDeploymentValidation(context: {
    validationType: 'health-check' | 'full-validation' | 'component-validation';
    success: boolean;
    score?: number;
    duration: number;
    component?: string;
    criticalIssues?: string[];
    warnings?: string[];
    recommendations?: string[];
    environment?: string;
    metadata?: Record<string, any>;
  }) {
    return Sentry.withScope((scope) => {
      scope.setTag('operation_type', 'deployment_validation');
      scope.setTag('validation_type', context.validationType);
      scope.setTag('validation_success', context.success.toString());
      scope.setTag('environment', context.environment || process.env.NODE_ENV || 'unknown');

      if (context.component) {
        scope.setTag('validation_component', context.component);
      }

      scope.setContext('deployment_validation', {
        validation_type: context.validationType,
        success: context.success,
        score: context.score,
        duration_ms: context.duration,
        component: context.component,
        critical_issues_count: context.criticalIssues?.length || 0,
        warnings_count: context.warnings?.length || 0,
        recommendations_count: context.recommendations?.length || 0,
        environment: context.environment,
        timestamp: new Date().toISOString(),
        ...context.metadata
      });

      if (context.criticalIssues?.length) {
        scope.setContext('critical_issues', {
          issues: context.criticalIssues,
          count: context.criticalIssues.length
        });
      }

      if (context.success) {
        const message = context.component
          ? `Deployment validation success: ${context.component}`
          : `Deployment validation success: ${context.validationType}`;

        return Sentry.addBreadcrumb({
          message,
          level: 'info',
          data: {
            validation_type: context.validationType,
            score: context.score,
            duration_ms: context.duration,
            component: context.component
          }
        });
      } else {
        const errorMessage = context.component
          ? `Deployment validation failed for ${context.component}`
          : `Deployment validation failed: ${context.validationType}`;

        return this.captureError(
          new ChatbotError(errorMessage, 'deployment_validation', {
            validation_type: context.validationType,
            component: context.component,
            critical_issues: context.criticalIssues,
            warnings: context.warnings
          }),
          {
            operation: 'deployment_validation',
            additionalData: {
              validation_type: context.validationType,
              score: context.score,
              duration_ms: context.duration,
              component: context.component,
              critical_issues_count: context.criticalIssues?.length || 0,
              warnings_count: context.warnings?.length || 0
            }
          }
        );
      }
    });
  }

  // Environment variable validation monitoring
  static captureEnvironmentValidation(context: {
    success: boolean;
    missingVariables: string[];
    presentVariables: string[];
    totalVariables: number;
    duration: number;
    environment?: string;
  }) {
    return Sentry.withScope((scope) => {
      scope.setTag('operation_type', 'environment_validation');
      scope.setTag('env_validation_success', context.success.toString());
      scope.setTag('environment', context.environment || process.env.NODE_ENV || 'unknown');

      scope.setContext('environment_validation', {
        success: context.success,
        missing_variables_count: context.missingVariables.length,
        present_variables_count: context.presentVariables.length,
        total_variables_count: context.totalVariables,
        completion_percentage: Math.round((context.presentVariables.length / context.totalVariables) * 100),
        duration_ms: context.duration,
        timestamp: new Date().toISOString()
      });

      if (context.missingVariables.length > 0) {
        scope.setContext('missing_environment_variables', {
          variables: context.missingVariables,
          count: context.missingVariables.length
        });
      }

      if (context.success) {
        return Sentry.addBreadcrumb({
          message: 'Environment validation completed successfully',
          level: 'info',
          data: {
            total_variables: context.totalVariables,
            duration_ms: context.duration
          }
        });
      } else {
        return this.captureError(
          new ChatbotError(
            `Environment validation failed: ${context.missingVariables.length} variables missing`,
            'environment_validation',
            { missing_variables: context.missingVariables }
          ),
          {
            operation: 'environment_validation',
            additionalData: {
              missing_count: context.missingVariables.length,
              total_count: context.totalVariables,
              completion_percentage: Math.round((context.presentVariables.length / context.totalVariables) * 100)
            }
          }
        );
      }
    });
  }

  // AWS services validation monitoring
  static captureAWSValidation(context: {
    success: boolean;
    services: Record<string, { success: boolean; error?: string }>;
    duration: number;
    region?: string;
  }) {
    return Sentry.withScope((scope) => {
      scope.setTag('operation_type', 'aws_validation');
      scope.setTag('aws_validation_success', context.success.toString());

      if (context.region) {
        scope.setTag('aws_region', context.region);
      }

      const successfulServices = Object.values(context.services).filter(s => s.success).length;
      const totalServices = Object.keys(context.services).length;

      scope.setContext('aws_validation', {
        success: context.success,
        successful_services: successfulServices,
        total_services: totalServices,
        success_rate: Math.round((successfulServices / totalServices) * 100),
        duration_ms: context.duration,
        services: context.services,
        timestamp: new Date().toISOString()
      });

      if (context.success) {
        return Sentry.addBreadcrumb({
          message: 'AWS services validation completed successfully',
          level: 'info',
          data: {
            successful_services: successfulServices,
            total_services: totalServices,
            duration_ms: context.duration
          }
        });
      } else {
        const failedServices = Object.entries(context.services)
          .filter(([_, service]) => !service.success)
          .map(([name, _]) => name);

        return this.captureError(
          new ChatbotError(
            `AWS services validation failed: ${failedServices.join(', ')}`,
            'aws_validation',
            { failed_services: failedServices, services: context.services }
          ),
          {
            operation: 'aws_validation',
            additionalData: {
              failed_services: failedServices,
              success_rate: Math.round((successfulServices / totalServices) * 100),
              region: context.region
            }
          }
        );
      }
    });
  }

  // Database validation monitoring
  static captureDatabaseValidation(context: {
    success: boolean;
    connectionTime?: number;
    pgVersion?: string;
    extensions?: string[];
    tables?: string[];
    missingExtensions?: string[];
    missingTables?: string[];
    duration: number;
    errorMessage?: string;
  }) {
    return Sentry.withScope((scope) => {
      scope.setTag('operation_type', 'database_validation');
      scope.setTag('db_validation_success', context.success.toString());

      if (context.pgVersion) {
        scope.setTag('postgres_version', context.pgVersion);
      }

      scope.setContext('database_validation', {
        success: context.success,
        connection_time_ms: context.connectionTime,
        postgres_version: context.pgVersion,
        extensions_count: context.extensions?.length || 0,
        tables_count: context.tables?.length || 0,
        missing_extensions_count: context.missingExtensions?.length || 0,
        missing_tables_count: context.missingTables?.length || 0,
        duration_ms: context.duration,
        error_message: context.errorMessage,
        timestamp: new Date().toISOString()
      });

      if (context.missingExtensions?.length) {
        scope.setContext('missing_database_extensions', {
          extensions: context.missingExtensions,
          count: context.missingExtensions.length
        });
      }

      if (context.missingTables?.length) {
        scope.setContext('missing_database_tables', {
          tables: context.missingTables,
          count: context.missingTables.length
        });
      }

      if (context.success) {
        return Sentry.addBreadcrumb({
          message: 'Database validation completed successfully',
          level: 'info',
          data: {
            postgres_version: context.pgVersion,
            extensions_count: context.extensions?.length || 0,
            tables_count: context.tables?.length || 0,
            duration_ms: context.duration
          }
        });
      } else {
        return this.captureError(
          new ChatbotError(
            context.errorMessage || 'Database validation failed',
            'database_validation',
            {
              missing_extensions: context.missingExtensions,
              missing_tables: context.missingTables,
              postgres_version: context.pgVersion
            }
          ),
          {
            operation: 'database_validation',
            additionalData: {
              connection_time_ms: context.connectionTime,
              missing_extensions_count: context.missingExtensions?.length || 0,
              missing_tables_count: context.missingTables?.length || 0
            }
          }
        );
      }
    });
  }

  // Health check monitoring
  static captureHealthCheck(context: {
    type: 'basic' | 'quick' | 'comprehensive';
    success: boolean;
    score?: number;
    duration: number;
    checks?: Record<string, boolean>;
    endpoint: string;
    userAgent?: string;
  }) {
    return Sentry.withScope((scope) => {
      scope.setTag('operation_type', 'health_check');
      scope.setTag('health_check_type', context.type);
      scope.setTag('health_check_success', context.success.toString());
      scope.setTag('health_check_endpoint', context.endpoint);

      if (context.userAgent) {
        scope.setTag('user_agent', context.userAgent);
      }

      const successfulChecks = context.checks ? Object.values(context.checks).filter(Boolean).length : 0;
      const totalChecks = context.checks ? Object.keys(context.checks).length : 0;

      scope.setContext('health_check', {
        type: context.type,
        success: context.success,
        score: context.score,
        duration_ms: context.duration,
        endpoint: context.endpoint,
        successful_checks: successfulChecks,
        total_checks: totalChecks,
        checks: context.checks,
        timestamp: new Date().toISOString()
      });

      return Sentry.addBreadcrumb({
        message: `Health check (${context.type}): ${context.success ? 'SUCCESS' : 'FAILED'}`,
        level: context.success ? 'info' : 'warning',
        data: {
          type: context.type,
          score: context.score,
          duration_ms: context.duration,
          successful_checks: successfulChecks,
          total_checks: totalChecks
        }
      });
    });
  }
}

export default SentryUtils;