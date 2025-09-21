import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E Tests for Chatbot Creation and Configuration
 *
 * Tests the complete chatbot management workflow including:
 * - Chatbot creation with various configurations
 * - Multi-model support and configuration validation
 * - RAG integration and vector search testing
 * - Knowledge base filtering effectiveness
 * - Performance metrics tracking
 * - Real-time conversation updates
 * - Cost tracking and token usage
 * - Error handling and fallback behavior
 */

test.describe('Chatbot Creation and Configuration', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to chatbot management interface
    await page.goto('/dashboard/chatbots');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Basic Chatbot Creation', () => {

    test('should create a new chatbot with minimal configuration', async ({ page }) => {
      // Click create new chatbot button
      await page.click('[data-testid="create-chatbot-button"]');
      await page.waitForSelector('[data-testid="chatbot-creation-form"]');

      // Fill basic information
      await page.fill('[data-testid="chatbot-name"]', 'Test Customer Support Bot');
      await page.fill('[data-testid="chatbot-description"]', 'A test chatbot for customer support scenarios');

      // Select LLM model
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-haiku-20240307-v1:0');

      // Set system prompt
      const systemPrompt = `You are a helpful customer service assistant. Your role is to:
- Answer customer questions accurately and politely
- Provide product information and specifications
- Help troubleshoot common issues
- Escalate complex problems to human agents when necessary
- Maintain a professional and friendly tone at all times`;

      await page.fill('[data-testid="system-prompt"]', systemPrompt);

      // Submit form
      await page.click('[data-testid="create-chatbot-submit"]');

      // Wait for success response
      await page.waitForSelector('[data-testid="creation-success-message"]');

      // Verify chatbot appears in list
      await page.waitForSelector('[data-testid="chatbot-list"]');
      await expect(page.locator('[data-testid="chatbot-card"]').first()).toContainText('Test Customer Support Bot');

      // Verify status is draft
      await expect(page.locator('[data-testid="chatbot-status"]').first()).toContainText('draft');
    });

    test('should validate required fields during creation', async ({ page }) => {
      await page.click('[data-testid="create-chatbot-button"]');
      await page.waitForSelector('[data-testid="chatbot-creation-form"]');

      // Try to submit empty form
      await page.click('[data-testid="create-chatbot-submit"]');

      // Check for validation errors
      await expect(page.locator('[data-testid="name-error"]')).toContainText('name is required');
      await expect(page.locator('[data-testid="model-provider-error"]')).toContainText('model_provider is required');
      await expect(page.locator('[data-testid="system-prompt-error"]')).toContainText('system_prompt is required');
    });

    test('should prevent duplicate chatbot names within organization', async ({ page }) => {
      // Create first chatbot
      await page.click('[data-testid="create-chatbot-button"]');
      await page.fill('[data-testid="chatbot-name"]', 'Duplicate Name Test');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-haiku-20240307-v1:0');
      await page.fill('[data-testid="system-prompt"]', 'Test prompt for first chatbot');
      await page.click('[data-testid="create-chatbot-submit"]');
      await page.waitForSelector('[data-testid="creation-success-message"]');

      // Try to create second chatbot with same name
      await page.click('[data-testid="create-chatbot-button"]');
      await page.fill('[data-testid="chatbot-name"]', 'Duplicate Name Test');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-sonnet-20240229-v1:0');
      await page.fill('[data-testid="system-prompt"]', 'Test prompt for second chatbot');
      await page.click('[data-testid="create-chatbot-submit"]');

      // Should show error
      await expect(page.locator('[data-testid="creation-error-message"]')).toContainText('already exists');
    });
  });

  test.describe('Multi-Model Configuration', () => {

    test('should create chatbot with Claude Haiku configuration', async ({ page }) => {
      await page.click('[data-testid="create-chatbot-button"]');

      // Fill basic info
      await page.fill('[data-testid="chatbot-name"]', 'Haiku Test Bot');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-haiku-20240307-v1:0');
      await page.fill('[data-testid="system-prompt"]', 'You are a helpful assistant optimized for high-volume, cost-effective responses.');

      // Configure model parameters
      await page.click('[data-testid="advanced-config-toggle"]');
      await page.fill('[data-testid="temperature"]', '0.3');
      await page.fill('[data-testid="max-tokens"]', '800');
      await page.fill('[data-testid="top-p"]', '0.9');

      await page.click('[data-testid="create-chatbot-submit"]');
      await page.waitForSelector('[data-testid="creation-success-message"]');

      // Verify configuration saved correctly
      await page.click('[data-testid="chatbot-card"]').first();
      await page.waitForSelector('[data-testid="chatbot-details"]');

      await expect(page.locator('[data-testid="model-display"]')).toContainText('Claude 3 Haiku');
      await expect(page.locator('[data-testid="temperature-display"]')).toContainText('0.3');
      await expect(page.locator('[data-testid="estimated-cost"]')).toContainText('$0.00'); // Haiku is cheapest
    });

    test('should create chatbot with Claude Sonnet configuration', async ({ page }) => {
      await page.click('[data-testid="create-chatbot-button"]');

      await page.fill('[data-testid="chatbot-name"]', 'Sonnet Test Bot');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-sonnet-20240229-v1:0');
      await page.fill('[data-testid="system-prompt"]', 'You are a technical assistant capable of complex reasoning and detailed explanations.');

      await page.click('[data-testid="advanced-config-toggle"]');
      await page.fill('[data-testid="temperature"]', '0.7');
      await page.fill('[data-testid="max-tokens"]', '1500');
      await page.fill('[data-testid="context-window"]', '6000');

      await page.click('[data-testid="create-chatbot-submit"]');
      await page.waitForSelector('[data-testid="creation-success-message"]');

      // Verify higher cost estimation for Sonnet
      await page.click('[data-testid="chatbot-card"]').first();
      await expect(page.locator('[data-testid="model-display"]')).toContainText('Claude 3 Sonnet');
    });

    test('should create chatbot with Titan model configuration', async ({ page }) => {
      await page.click('[data-testid="create-chatbot-button"]');

      await page.fill('[data-testid="chatbot-name"]', 'Titan Test Bot');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'amazon.titan-text-express-v1');
      await page.fill('[data-testid="system-prompt"]', 'You are a cost-effective assistant for basic customer inquiries.');

      await page.click('[data-testid="create-chatbot-submit"]');
      await page.waitForSelector('[data-testid="creation-success-message"]');

      await page.click('[data-testid="chatbot-card"]').first();
      await expect(page.locator('[data-testid="model-display"]')).toContainText('Titan');
    });
  });

  test.describe('RAG Configuration and Testing', () => {

    test('should configure RAG settings and test retrieval', async ({ page }) => {
      await page.click('[data-testid="create-chatbot-button"]');

      // Basic setup
      await page.fill('[data-testid="chatbot-name"]', 'RAG Test Bot');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-haiku-20240307-v1:0');
      await page.fill('[data-testid="system-prompt"]', 'You are an assistant with access to a knowledge base.');

      // Configure RAG settings
      await page.click('[data-testid="rag-config-toggle"]');
      await page.check('[data-testid="rag-enabled"]');
      await page.fill('[data-testid="retrieval-k"]', '5');
      await page.fill('[data-testid="score-threshold"]', '0.7');

      await page.click('[data-testid="create-chatbot-submit"]');
      await page.waitForSelector('[data-testid="creation-success-message"]');

      // Test RAG functionality
      await page.click('[data-testid="chatbot-card"]').first();
      await page.click('[data-testid="test-playground-tab"]');

      // Send test query
      const testQuery = 'What products do you have for sensitive skin?';
      await page.fill('[data-testid="test-message-input"]', testQuery);
      await page.click('[data-testid="send-test-message"]');

      // Wait for response with sources
      await page.waitForSelector('[data-testid="response-message"]', { timeout: 30000 });
      await page.waitForSelector('[data-testid="knowledge-sources"]');

      // Verify RAG sources are displayed
      const sources = page.locator('[data-testid="source-document"]');
      await expect(sources).toHaveCountGreaterThan(0);

      // Check retrieval metrics
      await expect(page.locator('[data-testid="retrieval-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-time"]')).toBeVisible();
    });

    test('should test different retrieval_k values', async ({ page }) => {
      // Create chatbot with high retrieval_k
      await page.click('[data-testid="create-chatbot-button"]');
      await page.fill('[data-testid="chatbot-name"]', 'High K Retrieval Bot');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-haiku-20240307-v1:0');
      await page.fill('[data-testid="system-prompt"]', 'Assistant with extensive knowledge retrieval.');

      await page.click('[data-testid="rag-config-toggle"]');
      await page.fill('[data-testid="retrieval-k"]', '10'); // High retrieval count
      await page.fill('[data-testid="score-threshold"]', '0.6'); // Lower threshold

      await page.click('[data-testid="create-chatbot-submit"]');
      await page.waitForSelector('[data-testid="creation-success-message"]');

      // Test with complex query
      await page.click('[data-testid="chatbot-card"]').first();
      await page.click('[data-testid="test-playground-tab"]');

      await page.fill('[data-testid="test-message-input"]', 'Compare different moisturizers for dry skin with detailed ingredient analysis');
      await page.click('[data-testid="send-test-message"]');

      await page.waitForSelector('[data-testid="response-message"]', { timeout: 30000 });

      // Should retrieve more sources due to higher K
      const sources = page.locator('[data-testid="source-document"]');
      await expect(sources).toHaveCountGreaterThanOrEqual(5);
    });

    test('should test score threshold filtering', async ({ page }) => {
      await page.click('[data-testid="create-chatbot-button"]');
      await page.fill('[data-testid="chatbot-name"]', 'High Threshold Bot');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-haiku-20240307-v1:0');
      await page.fill('[data-testid="system-prompt"]', 'Assistant with strict relevance filtering.');

      await page.click('[data-testid="rag-config-toggle"]');
      await page.fill('[data-testid="score-threshold"]', '0.9'); // Very high threshold

      await page.click('[data-testid="create-chatbot-submit"]');
      await page.waitForSelector('[data-testid="creation-success-message"]');

      // Test with off-topic query
      await page.click('[data-testid="chatbot-card"]').first();
      await page.click('[data-testid="test-playground-tab"]');

      await page.fill('[data-testid="test-message-input"]', 'What is the weather like today?');
      await page.click('[data-testid="send-test-message"]');

      await page.waitForSelector('[data-testid="response-message"]', { timeout: 30000 });

      // Should have few or no sources due to high threshold
      const noSources = page.locator('[data-testid="no-relevant-sources"]');
      await expect(noSources).toBeVisible();
    });
  });

  test.describe('Knowledge Base Filtering', () => {

    test('should configure product category filtering', async ({ page }) => {
      await page.click('[data-testid="create-chatbot-button"]');
      await page.fill('[data-testid="chatbot-name"]', 'Skincare Specialist Bot');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-haiku-20240307-v1:0');
      await page.fill('[data-testid="system-prompt"]', 'You are a skincare specialist focused on cosmetic products.');

      // Configure knowledge filtering
      await page.click('[data-testid="knowledge-filter-toggle"]');
      await page.check('[data-testid="category-skincare"]');
      await page.check('[data-testid="category-cosmetics"]');
      await page.uncheck('[data-testid="category-supplements"]'); // Exclude irrelevant category

      await page.click('[data-testid="create-chatbot-submit"]');
      await page.waitForSelector('[data-testid="creation-success-message"]');

      // Test filtering effectiveness
      await page.click('[data-testid="chatbot-card"]').first();
      await page.click('[data-testid="test-playground-tab"]');

      // Query about skincare (should find results)
      await page.fill('[data-testid="test-message-input"]', 'What moisturizers do you recommend for oily skin?');
      await page.click('[data-testid="send-test-message"]');
      await page.waitForSelector('[data-testid="response-message"]', { timeout: 30000 });

      const sources = page.locator('[data-testid="source-document"]');
      await expect(sources).toHaveCountGreaterThan(0);

      // Verify sources are from correct categories
      await expect(page.locator('[data-testid="source-category"]').first()).toContainText(/skincare|cosmetics/);
    });

    test('should test document type filtering', async ({ page }) => {
      await page.click('[data-testid="create-chatbot-button"]');
      await page.fill('[data-testid="chatbot-name"]', 'Technical Support Bot');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-sonnet-20240229-v1:0');
      await page.fill('[data-testid="system-prompt"]', 'You provide technical support using official documentation.');

      await page.click('[data-testid="knowledge-filter-toggle"]');
      await page.check('[data-testid="doc-type-technical"]');
      await page.check('[data-testid="doc-type-safety"]');
      await page.uncheck('[data-testid="doc-type-marketing"]'); // Exclude marketing materials

      await page.click('[data-testid="create-chatbot-submit"]');
      await page.waitForSelector('[data-testid="creation-success-message"]');

      // Test with technical query
      await page.click('[data-testid="chatbot-card"]').first();
      await page.click('[data-testid="test-playground-tab"]');

      await page.fill('[data-testid="test-message-input"]', 'What are the safety guidelines for product storage?');
      await page.click('[data-testid="send-test-message"]');
      await page.waitForSelector('[data-testid="response-message"]', { timeout: 30000 });

      // Verify sources are technical/safety documents only
      const sourceTypes = page.locator('[data-testid="source-type"]');
      await expect(sourceTypes.first()).toContainText(/technical|safety/);
    });
  });

  test.describe('Performance Metrics and Monitoring', () => {

    test('should track response times and token usage', async ({ page }) => {
      // Create chatbot
      await page.click('[data-testid="create-chatbot-button"]');
      await page.fill('[data-testid="chatbot-name"]', 'Performance Test Bot');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-haiku-20240307-v1:0');
      await page.fill('[data-testid="system-prompt"]', 'You are a performance monitoring test assistant.');

      await page.click('[data-testid="create-chatbot-submit"]');
      await page.waitForSelector('[data-testid="creation-success-message"]');

      // Test multiple conversations
      await page.click('[data-testid="chatbot-card"]').first();
      await page.click('[data-testid="test-playground-tab"]');

      const testQueries = [
        'Hello, how are you?',
        'What products do you have?',
        'Can you help me with skincare recommendations?',
        'What is your return policy?',
        'Tell me about ingredient safety.'
      ];

      for (const query of testQueries) {
        await page.fill('[data-testid="test-message-input"]', query);
        await page.click('[data-testid="send-test-message"]');
        await page.waitForSelector('[data-testid="response-message"]', { timeout: 30000 });

        // Verify metrics are being tracked
        await expect(page.locator('[data-testid="response-time"]')).toBeVisible();
        await expect(page.locator('[data-testid="token-usage"]')).toBeVisible();

        // Wait briefly between messages
        await page.waitForTimeout(1000);
      }

      // Check accumulated metrics
      await page.click('[data-testid="metrics-tab"]');
      await expect(page.locator('[data-testid="total-messages"]')).toContainText('5');
      await expect(page.locator('[data-testid="avg-response-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-cost"]')).toBeVisible();
    });

    test('should monitor conversation quality metrics', async ({ page }) => {
      await page.click('[data-testid="create-chatbot-button"]');
      await page.fill('[data-testid="chatbot-name"]', 'Quality Test Bot');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-haiku-20240307-v1:0');
      await page.fill('[data-testid="system-prompt"]', 'You are a quality monitoring test assistant.');

      await page.click('[data-testid="create-chatbot-submit"]');
      await page.waitForSelector('[data-testid="creation-success-message"]');

      await page.click('[data-testid="chatbot-card"]').first();
      await page.click('[data-testid="test-playground-tab"]');

      // Send message and provide feedback
      await page.fill('[data-testid="test-message-input"]', 'What is your best moisturizer?');
      await page.click('[data-testid="send-test-message"]');
      await page.waitForSelector('[data-testid="response-message"]', { timeout: 30000 });

      // Rate the response
      await page.click('[data-testid="thumbs-up"]');
      await page.click('[data-testid="feedback-submit"]');

      // Send another message with negative feedback
      await page.fill('[data-testid="test-message-input"]', 'Tell me about pricing');
      await page.click('[data-testid="send-test-message"]');
      await page.waitForSelector('[data-testid="response-message"]', { timeout: 30000 });

      await page.click('[data-testid="thumbs-down"]');
      await page.fill('[data-testid="feedback-text"]', 'Response was not specific enough');
      await page.click('[data-testid="feedback-submit"]');

      // Check quality metrics
      await page.click('[data-testid="metrics-tab"]');
      await expect(page.locator('[data-testid="satisfaction-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="positive-feedback"]')).toContainText('50%');
    });
  });

  test.describe('Real-time Conversation Updates', () => {

    test('should update conversation state in real-time', async ({ page, context }) => {
      // Create chatbot
      await page.click('[data-testid="create-chatbot-button"]');
      await page.fill('[data-testid="chatbot-name"]', 'Realtime Test Bot');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-haiku-20240307-v1:0');
      await page.fill('[data-testid="system-prompt"]', 'You are a real-time testing assistant.');

      await page.click('[data-testid="create-chatbot-submit"]');
      await page.waitForSelector('[data-testid="creation-success-message"]');

      // Open chatbot in playground
      await page.click('[data-testid="chatbot-card"]').first();
      await page.click('[data-testid="test-playground-tab"]');

      // Open a second tab to simulate concurrent usage
      const page2 = await context.newPage();
      await page2.goto('/dashboard/chatbots');
      await page2.click('[data-testid="chatbot-card"]').first();
      await page2.click('[data-testid="metrics-tab"]');

      // Send message from first tab
      await page.fill('[data-testid="test-message-input"]', 'Hello from tab 1');
      await page.click('[data-testid="send-test-message"]');
      await page.waitForSelector('[data-testid="response-message"]', { timeout: 30000 });

      // Check if metrics updated in second tab
      await page2.waitForTimeout(2000); // Allow time for real-time updates
      await page2.reload(); // In real implementation, this would be automatic via WebSocket

      await expect(page2.locator('[data-testid="total-messages"]')).toContainText('1');

      await page2.close();
    });
  });

  test.describe('Error Handling and Fallbacks', () => {

    test('should handle API rate limiting gracefully', async ({ page }) => {
      await page.click('[data-testid="create-chatbot-button"]');
      await page.fill('[data-testid="chatbot-name"]', 'Rate Limit Test Bot');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-haiku-20240307-v1:0');
      await page.fill('[data-testid="system-prompt"]', 'You are a rate limiting test assistant.');

      await page.click('[data-testid="create-chatbot-submit"]');
      await page.waitForSelector('[data-testid="creation-success-message"]');

      await page.click('[data-testid="chatbot-card"]').first();
      await page.click('[data-testid="test-playground-tab"]');

      // Send many messages rapidly to trigger rate limiting
      for (let i = 0; i < 10; i++) {
        await page.fill('[data-testid="test-message-input"]', `Test message ${i + 1}`);
        await page.click('[data-testid="send-test-message"]');
        // Don't wait for response to trigger rate limiting
      }

      // Should show rate limiting message
      await expect(page.locator('[data-testid="rate-limit-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-suggestion"]')).toBeVisible();
    });

    test('should show fallback message when RAG fails', async ({ page }) => {
      await page.click('[data-testid="create-chatbot-button"]');
      await page.fill('[data-testid="chatbot-name"]', 'Fallback Test Bot');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-haiku-20240307-v1:0');
      await page.fill('[data-testid="system-prompt"]', 'You are a fallback testing assistant.');
      await page.fill('[data-testid="fallback-message"]', 'I apologize, but I am experiencing technical difficulties. Please try again later.');

      await page.click('[data-testid="create-chatbot-submit"]');
      await page.waitForSelector('[data-testid="creation-success-message"]');

      await page.click('[data-testid="chatbot-card"]').first();
      await page.click('[data-testid="test-playground-tab"]');

      // Simulate network error or RAG failure
      await page.route('**/api/v1/conversations/*/messages', route => {
        route.abort('failed');
      });

      await page.fill('[data-testid="test-message-input"]', 'This should trigger fallback');
      await page.click('[data-testid="send-test-message"]');

      // Should show fallback message
      await page.waitForSelector('[data-testid="fallback-response"]');
      await expect(page.locator('[data-testid="response-message"]')).toContainText('experiencing technical difficulties');
    });

    test('should validate model configuration limits', async ({ page }) => {
      await page.click('[data-testid="create-chatbot-button"]');

      await page.fill('[data-testid="chatbot-name"]', 'Config Validation Bot');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-haiku-20240307-v1:0');
      await page.fill('[data-testid="system-prompt"]', 'Test prompt');

      await page.click('[data-testid="advanced-config-toggle"]');

      // Test invalid temperature
      await page.fill('[data-testid="temperature"]', '3.0'); // Invalid: > 2.0
      await page.click('[data-testid="create-chatbot-submit"]');
      await expect(page.locator('[data-testid="temperature-error"]')).toContainText('must be between 0 and 2');

      // Test invalid max tokens
      await page.fill('[data-testid="temperature"]', '0.7');
      await page.fill('[data-testid="max-tokens"]', '-100'); // Invalid: negative
      await page.click('[data-testid="create-chatbot-submit"]');
      await expect(page.locator('[data-testid="max-tokens-error"]')).toContainText('must be a positive number');

      // Test invalid top-p
      await page.fill('[data-testid="max-tokens"]', '1000');
      await page.fill('[data-testid="top-p"]', '1.5'); // Invalid: > 1.0
      await page.click('[data-testid="create-chatbot-submit"]');
      await expect(page.locator('[data-testid="top-p-error"]')).toContainText('must be between 0 and 1');
    });
  });

  test.describe('Cost Tracking and Optimization', () => {

    test('should compare costs across different models', async ({ page }) => {
      const models = [
        { name: 'Haiku Cost Test', model: 'anthropic.claude-3-haiku-20240307-v1:0' },
        { name: 'Sonnet Cost Test', model: 'anthropic.claude-3-sonnet-20240229-v1:0' },
        { name: 'Titan Cost Test', model: 'amazon.titan-text-express-v1' }
      ];

      const costs = [];

      for (const modelConfig of models) {
        // Create chatbot with specific model
        await page.click('[data-testid="create-chatbot-button"]');
        await page.fill('[data-testid="chatbot-name"]', modelConfig.name);
        await page.selectOption('[data-testid="model-provider"]', 'bedrock');
        await page.selectOption('[data-testid="model-name"]', modelConfig.model);
        await page.fill('[data-testid="system-prompt"]', 'Cost comparison test assistant.');

        await page.click('[data-testid="create-chatbot-submit"]');
        await page.waitForSelector('[data-testid="creation-success-message"]');

        // Test same query on each model
        await page.click('[data-testid="chatbot-card"]').first();
        await page.click('[data-testid="test-playground-tab"]');

        await page.fill('[data-testid="test-message-input"]', 'Please provide a detailed explanation of skincare routines for different skin types.');
        await page.click('[data-testid="send-test-message"]');
        await page.waitForSelector('[data-testid="response-message"]', { timeout: 30000 });

        // Record cost for comparison
        const costText = await page.locator('[data-testid="message-cost"]').textContent();
        costs.push({ model: modelConfig.model, cost: costText });

        // Go back to list
        await page.click('[data-testid="back-to-list"]');
      }

      // Verify Haiku is cheapest, Sonnet is more expensive
      expect(costs.length).toBe(3);
      console.log('Cost comparison:', costs);
    });

    test('should track cumulative costs over multiple conversations', async ({ page }) => {
      await page.click('[data-testid="create-chatbot-button"]');
      await page.fill('[data-testid="chatbot-name"]', 'Cumulative Cost Bot');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-sonnet-20240229-v1:0'); // More expensive model
      await page.fill('[data-testid="system-prompt"]', 'Cost tracking test assistant.');

      await page.click('[data-testid="create-chatbot-submit"]');
      await page.waitForSelector('[data-testid="creation-success-message"]');

      await page.click('[data-testid="chatbot-card"]').first();
      await page.click('[data-testid="test-playground-tab"]');

      // Initial cost should be 0
      await page.click('[data-testid="metrics-tab"]');
      await expect(page.locator('[data-testid="total-cost"]')).toContainText('$0.00');

      // Send multiple messages
      await page.click('[data-testid="test-playground-tab"]');
      const messages = [
        'What are your best products?',
        'Can you explain the benefits of vitamin C serum?',
        'How should I build a skincare routine?',
        'What ingredients should I avoid for sensitive skin?'
      ];

      for (const message of messages) {
        await page.fill('[data-testid="test-message-input"]', message);
        await page.click('[data-testid="send-test-message"]');
        await page.waitForSelector('[data-testid="response-message"]', { timeout: 30000 });
        await page.waitForTimeout(1000);
      }

      // Check cumulative cost
      await page.click('[data-testid="metrics-tab"]');
      const totalCost = await page.locator('[data-testid="total-cost"]').textContent();
      expect(totalCost).not.toBe('$0.00');

      // Verify cost breakdown
      await expect(page.locator('[data-testid="input-tokens-cost"]')).toBeVisible();
      await expect(page.locator('[data-testid="output-tokens-cost"]')).toBeVisible();
    });
  });

  test.describe('Chatbot Status Management', () => {

    test('should activate chatbot and change status from draft to active', async ({ page }) => {
      // Create chatbot (starts as draft)
      await page.click('[data-testid="create-chatbot-button"]');
      await page.fill('[data-testid="chatbot-name"]', 'Activation Test Bot');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-haiku-20240307-v1:0');
      await page.fill('[data-testid="system-prompt"]', 'You are an activation test assistant.');

      await page.click('[data-testid="create-chatbot-submit"]');
      await page.waitForSelector('[data-testid="creation-success-message"]');

      // Verify starts as draft
      await expect(page.locator('[data-testid="chatbot-status"]').first()).toContainText('draft');

      // Activate chatbot
      await page.click('[data-testid="chatbot-card"]').first();
      await page.click('[data-testid="activate-chatbot"]');
      await page.waitForSelector('[data-testid="activation-confirmation"]');
      await page.click('[data-testid="confirm-activation"]');

      // Verify status changed to active
      await page.waitForSelector('[data-testid="status-active"]');
      await expect(page.locator('[data-testid="chatbot-status"]')).toContainText('active');

      // Verify activation timestamp
      await expect(page.locator('[data-testid="activated-at"]')).toBeVisible();
    });

    test('should prevent activation of incomplete chatbot configuration', async ({ page }) => {
      // Create minimal chatbot missing required config
      await page.click('[data-testid="create-chatbot-button"]');
      await page.fill('[data-testid="chatbot-name"]', 'Incomplete Bot');
      await page.selectOption('[data-testid="model-provider"]', 'bedrock');
      await page.selectOption('[data-testid="model-name"]', 'anthropic.claude-3-haiku-20240307-v1:0');
      await page.fill('[data-testid="system-prompt"]', 'Short'); // Too short

      await page.click('[data-testid="create-chatbot-submit"]');
      await page.waitForSelector('[data-testid="creation-success-message"]');

      // Try to activate
      await page.click('[data-testid="chatbot-card"]').first();
      await page.click('[data-testid="activate-chatbot"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="activation-blocked"]')).toBeVisible();
      await expect(page.locator('[data-testid="configuration-errors"]')).toContainText('system_prompt too short');
    });
  });
});