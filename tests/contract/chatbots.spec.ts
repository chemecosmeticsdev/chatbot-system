import { test, expect } from '@playwright/test';

/**
 * Contract Tests: Chatbots API
 *
 * These tests validate the Chatbots API endpoints according to the OpenAPI contract.
 * Following TDD approach - these tests MUST fail initially.
 */

const API_BASE = '/api/v1';

test.describe('Chatbots API Contract Tests', () => {
  test.describe('POST /api/v1/chatbots', () => {
    test('should create a new chatbot with valid configuration', async ({ request }) => {
      const chatbotData = {
        name: 'Test Assistant',
        description: 'A test chatbot for validation',
        status: 'draft',
        llm_provider: 'bedrock',
        llm_model: 'anthropic.claude-3-haiku-20240307-v1:0',
        system_prompt: 'You are a helpful assistant for answering questions about products.',
        model_config: {
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 0.9
        },
        rag_enabled: true,
        retrieval_k: 5,
        score_threshold: 0.7,
        context_window: 4000,
        welcome_message: 'Hello! How can I help you today?',
        fallback_message: 'I apologize, I don\'t have enough information to answer that.'
      };

      const response = await request.post(`${API_BASE}/chatbots`, {
        data: chatbotData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Contract validation
      expect(response.status()).toBe(201);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const chatbot = responseData.data;
      expect(chatbot).toHaveProperty('id');
      expect(chatbot).toHaveProperty('name', chatbotData.name);
      expect(chatbot).toHaveProperty('description', chatbotData.description);
      expect(chatbot).toHaveProperty('status', chatbotData.status);
      expect(chatbot).toHaveProperty('llm_provider', chatbotData.llm_provider);
      expect(chatbot).toHaveProperty('llm_model', chatbotData.llm_model);
      expect(chatbot).toHaveProperty('system_prompt', chatbotData.system_prompt);
      expect(chatbot).toHaveProperty('model_config');
      expect(chatbot).toHaveProperty('rag_enabled', chatbotData.rag_enabled);
      expect(chatbot).toHaveProperty('created_at');
      expect(chatbot).toHaveProperty('updated_at');
    });

    test('should return 400 for missing required fields', async ({ request }) => {
      const invalidData = {
        description: 'Missing required fields'
      };

      const response = await request.post(`${API_BASE}/chatbots`, {
        data: invalidData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('error');
      expect(responseData.error).toContain('name');
      expect(responseData.error).toContain('llm_model');
      expect(responseData.error).toContain('system_prompt');
    });

    test('should validate LLM model format', async ({ request }) => {
      const invalidModelData = {
        name: 'Test Bot',
        llm_model: 'invalid-model-format',
        system_prompt: 'Test prompt',
        llm_provider: 'bedrock'
      };

      const response = await request.post(`${API_BASE}/chatbots`, {
        data: invalidModelData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData.error).toContain('Invalid LLM model format');
    });

    test('should validate status values', async ({ request }) => {
      const invalidStatusData = {
        name: 'Test Bot',
        llm_model: 'anthropic.claude-3-haiku-20240307-v1:0',
        system_prompt: 'Test prompt',
        status: 'invalid_status'
      };

      const response = await request.post(`${API_BASE}/chatbots`, {
        data: invalidStatusData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData.error).toContain('Invalid status');
    });
  });

  test.describe('GET /api/v1/chatbots', () => {
    test('should retrieve paginated list of chatbots', async ({ request }) => {
      const response = await request.get(`${API_BASE}/chatbots`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const data = responseData.data;
      expect(data).toHaveProperty('instances');
      expect(data).toHaveProperty('pagination');

      // Validate pagination structure
      const pagination = data.pagination;
      expect(pagination).toHaveProperty('page');
      expect(pagination).toHaveProperty('limit');
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('totalPages');

      // Validate instances array structure
      expect(Array.isArray(data.instances)).toBe(true);

      if (data.instances.length > 0) {
        const chatbot = data.instances[0];
        expect(chatbot).toHaveProperty('id');
        expect(chatbot).toHaveProperty('name');
        expect(chatbot).toHaveProperty('status');
        expect(chatbot).toHaveProperty('llm_model');
      }
    });

    test('should support status filter', async ({ request }) => {
      const status = 'active';
      const response = await request.get(`${API_BASE}/chatbots?status=${status}`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      const instances = responseData.data.instances;

      // All returned chatbots should match the status filter
      instances.forEach((chatbot: any) => {
        expect(chatbot.status).toBe(status);
      });
    });

    test('should support LLM provider filter', async ({ request }) => {
      const provider = 'bedrock';
      const response = await request.get(`${API_BASE}/chatbots?llm_provider=${provider}`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      const instances = responseData.data.instances;

      // All returned chatbots should match the provider filter
      instances.forEach((chatbot: any) => {
        expect(chatbot.llm_provider).toBe(provider);
      });
    });
  });

  test.describe('GET /api/v1/chatbots/{id}', () => {
    test('should retrieve specific chatbot by ID', async ({ request }) => {
      const testChatbotId = '550e8400-e29b-41d4-a716-446655440001';

      const response = await request.get(`${API_BASE}/chatbots/${testChatbotId}`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const chatbot = responseData.data;
      expect(chatbot).toHaveProperty('id', testChatbotId);
      expect(chatbot).toHaveProperty('name');
      expect(chatbot).toHaveProperty('status');
      expect(chatbot).toHaveProperty('llm_model');
      expect(chatbot).toHaveProperty('system_prompt');
      expect(chatbot).toHaveProperty('model_config');
      expect(chatbot).toHaveProperty('rag_enabled');
      expect(chatbot).toHaveProperty('performance_metrics');
    });

    test('should return 404 for non-existent chatbot', async ({ request }) => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request.get(`${API_BASE}/chatbots/${nonExistentId}`);

      expect(response.status()).toBe(404);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData.error).toContain('Chatbot not found');
    });
  });

  test.describe('PUT /api/v1/chatbots/{id}', () => {
    test('should update chatbot configuration', async ({ request }) => {
      const testChatbotId = '550e8400-e29b-41d4-a716-446655440001';
      const updateData = {
        name: 'Updated Assistant',
        status: 'active',
        system_prompt: 'Updated system prompt for testing',
        model_config: {
          temperature: 0.8,
          max_tokens: 1500
        }
      };

      const response = await request.put(`${API_BASE}/chatbots/${testChatbotId}`, {
        data: updateData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData.data.name).toBe(updateData.name);
      expect(responseData.data.status).toBe(updateData.status);
      expect(responseData.data.system_prompt).toBe(updateData.system_prompt);
    });
  });

  test.describe('DELETE /api/v1/chatbots/{id}', () => {
    test('should delete chatbot instance', async ({ request }) => {
      const testChatbotId = '550e8400-e29b-41d4-a716-446655440001';

      const response = await request.delete(`${API_BASE}/chatbots/${testChatbotId}`);

      expect(response.status()).toBe(204);
    });

    test('should return 404 when deleting non-existent chatbot', async ({ request }) => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request.delete(`${API_BASE}/chatbots/${nonExistentId}`);

      expect(response.status()).toBe(404);
    });
  });
});