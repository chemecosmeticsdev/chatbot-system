import { test, expect } from '@playwright/test';

/**
 * Contract Tests: Analytics API
 *
 * These tests validate the Analytics API endpoints according to the OpenAPI contract.
 * Following TDD approach - these tests MUST fail initially.
 */

const API_BASE = '/api/v1';

test.describe('Analytics API Contract Tests', () => {
  test.describe('GET /api/v1/analytics/overview', () => {
    test('should retrieve system-wide analytics overview', async ({ request }) => {
      const response = await request.get(`${API_BASE}/analytics/overview`);

      // Contract validation
      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const analytics = responseData.data;

      // Overall system metrics
      expect(analytics).toHaveProperty('total_chatbots');
      expect(analytics).toHaveProperty('active_chatbots');
      expect(analytics).toHaveProperty('total_conversations');
      expect(analytics).toHaveProperty('total_messages');
      expect(analytics).toHaveProperty('unique_users');

      // Performance metrics
      expect(analytics).toHaveProperty('avg_response_time_ms');
      expect(analytics).toHaveProperty('avg_user_satisfaction');
      expect(analytics).toHaveProperty('success_rate');

      // Cost metrics
      expect(analytics).toHaveProperty('total_tokens_used');
      expect(analytics).toHaveProperty('estimated_cost_usd');

      // Time period info
      expect(analytics).toHaveProperty('period');
      expect(analytics.period).toHaveProperty('start_date');
      expect(analytics.period).toHaveProperty('end_date');

      // Validate data types
      expect(typeof analytics.total_chatbots).toBe('number');
      expect(typeof analytics.active_chatbots).toBe('number');
      expect(typeof analytics.total_conversations).toBe('number');
      expect(typeof analytics.total_messages).toBe('number');
      expect(typeof analytics.avg_response_time_ms).toBe('number');
    });

    test('should support date range filtering', async ({ request }) => {
      const startDate = '2025-09-01';
      const endDate = '2025-09-20';

      const response = await request.get(
        `${API_BASE}/analytics/overview?start_date=${startDate}&end_date=${endDate}`
      );

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      const analytics = responseData.data;

      expect(analytics.period.start_date).toBe(startDate);
      expect(analytics.period.end_date).toBe(endDate);
    });

    test('should return 400 for invalid date format', async ({ request }) => {
      const invalidDate = 'invalid-date';

      const response = await request.get(
        `${API_BASE}/analytics/overview?start_date=${invalidDate}`
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData.error).toContain('Invalid date format');
    });

    test('should return 400 when end_date is before start_date', async ({ request }) => {
      const startDate = '2025-09-20';
      const endDate = '2025-09-01';

      const response = await request.get(
        `${API_BASE}/analytics/overview?start_date=${startDate}&end_date=${endDate}`
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData.error).toContain('End date must be after start date');
    });
  });

  test.describe('GET /api/v1/analytics/chatbots/{id}', () => {
    test('should retrieve analytics for specific chatbot', async ({ request }) => {
      const testChatbotId = '550e8400-e29b-41d4-a716-446655440001';

      const response = await request.get(`${API_BASE}/analytics/chatbots/${testChatbotId}`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const analytics = responseData.data;

      // Chatbot-specific metrics
      expect(analytics).toHaveProperty('chatbot_id', testChatbotId);
      expect(analytics).toHaveProperty('chatbot_name');
      expect(analytics).toHaveProperty('total_conversations');
      expect(analytics).toHaveProperty('total_messages');
      expect(analytics).toHaveProperty('unique_users');
      expect(analytics).toHaveProperty('avg_session_duration_seconds');
      expect(analytics).toHaveProperty('avg_messages_per_session');

      // Performance metrics
      expect(analytics).toHaveProperty('avg_response_time_ms');
      expect(analytics).toHaveProperty('avg_user_satisfaction');
      expect(analytics).toHaveProperty('success_rate');

      // Platform breakdown
      expect(analytics).toHaveProperty('platform_breakdown');
      expect(typeof analytics.platform_breakdown).toBe('object');

      // Cost and usage
      expect(analytics).toHaveProperty('total_tokens_used');
      expect(analytics).toHaveProperty('estimated_cost_usd');
      expect(analytics).toHaveProperty('model_usage');

      // Trending data
      expect(analytics).toHaveProperty('daily_metrics');
      expect(Array.isArray(analytics.daily_metrics)).toBe(true);
    });

    test('should return 404 for non-existent chatbot', async ({ request }) => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request.get(`${API_BASE}/analytics/chatbots/${nonExistentId}`);

      expect(response.status()).toBe(404);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData.error).toContain('Chatbot not found');
    });
  });

  test.describe('GET /api/v1/analytics/conversations/trends', () => {
    test('should retrieve conversation trends data', async ({ request }) => {
      const response = await request.get(`${API_BASE}/analytics/conversations/trends`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const trends = responseData.data;

      // Time series data
      expect(trends).toHaveProperty('daily_conversations');
      expect(trends).toHaveProperty('daily_messages');
      expect(trends).toHaveProperty('daily_users');

      // Each trend should be an array of data points
      expect(Array.isArray(trends.daily_conversations)).toBe(true);
      expect(Array.isArray(trends.daily_messages)).toBe(true);
      expect(Array.isArray(trends.daily_users)).toBe(true);

      // Validate trend data structure
      if (trends.daily_conversations.length > 0) {
        const dataPoint = trends.daily_conversations[0];
        expect(dataPoint).toHaveProperty('date');
        expect(dataPoint).toHaveProperty('count');
        expect(typeof dataPoint.count).toBe('number');
      }

      // Platform trends
      expect(trends).toHaveProperty('platform_trends');
      expect(typeof trends.platform_trends).toBe('object');

      // Response time trends
      expect(trends).toHaveProperty('response_time_trends');
      expect(Array.isArray(trends.response_time_trends)).toBe(true);
    });

    test('should support granularity parameter', async ({ request }) => {
      const granularity = 'hourly';

      const response = await request.get(
        `${API_BASE}/analytics/conversations/trends?granularity=${granularity}`
      );

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData.data).toHaveProperty('granularity', granularity);
    });

    test('should validate granularity parameter', async ({ request }) => {
      const invalidGranularity = 'invalid';

      const response = await request.get(
        `${API_BASE}/analytics/conversations/trends?granularity=${invalidGranularity}`
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData.error).toContain('Invalid granularity');
    });
  });

  test.describe('GET /api/v1/analytics/performance', () => {
    test('should retrieve system performance metrics', async ({ request }) => {
      const response = await request.get(`${API_BASE}/analytics/performance`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const performance = responseData.data;

      // Response time metrics
      expect(performance).toHaveProperty('response_times');
      const responseTimes = performance.response_times;
      expect(responseTimes).toHaveProperty('avg_ms');
      expect(responseTimes).toHaveProperty('p50_ms');
      expect(responseTimes).toHaveProperty('p95_ms');
      expect(responseTimes).toHaveProperty('p99_ms');

      // Error rates
      expect(performance).toHaveProperty('error_rates');
      const errorRates = performance.error_rates;
      expect(errorRates).toHaveProperty('total_errors');
      expect(errorRates).toHaveProperty('error_rate_percent');
      expect(errorRates).toHaveProperty('errors_by_type');

      // System health
      expect(performance).toHaveProperty('system_health');
      const systemHealth = performance.system_health;
      expect(systemHealth).toHaveProperty('database_health');
      expect(systemHealth).toHaveProperty('vector_search_health');
      expect(systemHealth).toHaveProperty('llm_service_health');

      // Resource usage
      expect(performance).toHaveProperty('resource_usage');
      const resourceUsage = performance.resource_usage;
      expect(resourceUsage).toHaveProperty('total_requests');
      expect(resourceUsage).toHaveProperty('requests_per_minute');
      expect(resourceUsage).toHaveProperty('concurrent_sessions');
    });
  });

  test.describe('GET /api/v1/analytics/costs', () => {
    test('should retrieve cost breakdown and usage metrics', async ({ request }) => {
      const response = await request.get(`${API_BASE}/analytics/costs`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const costs = responseData.data;

      // Overall costs
      expect(costs).toHaveProperty('total_cost_usd');
      expect(costs).toHaveProperty('cost_per_conversation');
      expect(costs).toHaveProperty('cost_per_message');

      // LLM costs breakdown
      expect(costs).toHaveProperty('llm_costs');
      const llmCosts = costs.llm_costs;
      expect(llmCosts).toHaveProperty('input_tokens_cost');
      expect(llmCosts).toHaveProperty('output_tokens_cost');
      expect(llmCosts).toHaveProperty('total_tokens_used');
      expect(llmCosts).toHaveProperty('cost_by_model');

      // Other service costs
      expect(costs).toHaveProperty('storage_costs');
      expect(costs).toHaveProperty('vector_db_costs');
      expect(costs).toHaveProperty('ocr_processing_costs');

      // Usage projections
      expect(costs).toHaveProperty('projections');
      const projections = costs.projections;
      expect(projections).toHaveProperty('monthly_projected_cost');
      expect(projections).toHaveProperty('cost_trend');

      // Validate numeric types
      expect(typeof costs.total_cost_usd).toBe('number');
      expect(typeof costs.cost_per_conversation).toBe('number');
      expect(typeof llmCosts.total_tokens_used).toBe('number');
    });

    test('should support cost breakdown by chatbot', async ({ request }) => {
      const response = await request.get(`${API_BASE}/analytics/costs?breakdown_by=chatbot`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      const costs = responseData.data;

      expect(costs).toHaveProperty('chatbot_breakdown');
      expect(Array.isArray(costs.chatbot_breakdown)).toBe(true);

      if (costs.chatbot_breakdown.length > 0) {
        const chatbotCost = costs.chatbot_breakdown[0];
        expect(chatbotCost).toHaveProperty('chatbot_id');
        expect(chatbotCost).toHaveProperty('chatbot_name');
        expect(chatbotCost).toHaveProperty('total_cost_usd');
        expect(chatbotCost).toHaveProperty('tokens_used');
      }
    });
  });
});