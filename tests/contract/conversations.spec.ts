import { test, expect } from '@playwright/test';

/**
 * Contract Tests: Conversations API
 *
 * These tests validate the Conversations API endpoints according to the OpenAPI contract.
 * Following TDD approach - these tests MUST fail initially.
 */

const API_BASE = '/api/v1';

test.describe('Conversations API Contract Tests', () => {
  test.describe('POST /api/v1/chatbots/{id}/conversations', () => {
    test('should create a new conversation session', async ({ request }) => {
      const testChatbotId = '550e8400-e29b-41d4-a716-446655440001';
      const conversationData = {
        platform: 'web',
        user_identifier: 'test-user-123',
        session_context: {
          user_agent: 'Mozilla/5.0 Test Browser',
          page_url: '/dashboard/playground',
          initial_query: 'Hello, I need help with products'
        }
      };

      const response = await request.post(`${API_BASE}/chatbots/${testChatbotId}/conversations`, {
        data: conversationData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Contract validation
      expect(response.status()).toBe(201);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const session = responseData.data;
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('chatbot_id', testChatbotId);
      expect(session).toHaveProperty('platform', conversationData.platform);
      expect(session).toHaveProperty('user_identifier', conversationData.user_identifier);
      expect(session).toHaveProperty('status', 'active');
      expect(session).toHaveProperty('start_time');
      expect(session).toHaveProperty('message_count', 0);
      expect(session).toHaveProperty('session_context');
    });

    test('should return 400 for invalid platform', async ({ request }) => {
      const testChatbotId = '550e8400-e29b-41d4-a716-446655440001';
      const invalidData = {
        platform: 'invalid_platform',
        user_identifier: 'test-user-123'
      };

      const response = await request.post(`${API_BASE}/chatbots/${testChatbotId}/conversations`, {
        data: invalidData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData.error).toContain('Invalid platform');
    });

    test('should return 404 for non-existent chatbot', async ({ request }) => {
      const nonExistentChatbotId = '00000000-0000-0000-0000-000000000000';
      const conversationData = {
        platform: 'web',
        user_identifier: 'test-user-123'
      };

      const response = await request.post(`${API_BASE}/chatbots/${nonExistentChatbotId}/conversations`, {
        data: conversationData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(404);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData.error).toContain('Chatbot not found');
    });
  });

  test.describe('POST /api/v1/conversations/{id}/messages', () => {
    test('should send user message and receive bot response', async ({ request }) => {
      const testSessionId = '550e8400-e29b-41d4-a716-446655440002';
      const messageData = {
        content: 'What are the specifications for the Sample Product?',
        content_type: 'text'
      };

      const response = await request.post(`${API_BASE}/conversations/${testSessionId}/messages`, {
        data: messageData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Contract validation
      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const data = responseData.data;
      expect(data).toHaveProperty('user_message');
      expect(data).toHaveProperty('bot_response');

      // Validate user message structure
      const userMessage = data.user_message;
      expect(userMessage).toHaveProperty('id');
      expect(userMessage).toHaveProperty('session_id', testSessionId);
      expect(userMessage).toHaveProperty('message_type', 'user_message');
      expect(userMessage).toHaveProperty('content', messageData.content);
      expect(userMessage).toHaveProperty('timestamp');
      expect(userMessage).toHaveProperty('sequence_number');

      // Validate bot response structure
      const botResponse = data.bot_response;
      expect(botResponse).toHaveProperty('id');
      expect(botResponse).toHaveProperty('session_id', testSessionId);
      expect(botResponse).toHaveProperty('message_type', 'bot_response');
      expect(botResponse).toHaveProperty('content');
      expect(botResponse).toHaveProperty('timestamp');
      expect(botResponse).toHaveProperty('sequence_number');
      expect(botResponse).toHaveProperty('response_metadata');
      expect(botResponse).toHaveProperty('token_usage');
      expect(botResponse).toHaveProperty('processing_time_ms');
      expect(botResponse).toHaveProperty('model_used');
    });

    test('should handle empty message content', async ({ request }) => {
      const testSessionId = '550e8400-e29b-41d4-a716-446655440002';
      const messageData = {
        content: '',
        content_type: 'text'
      };

      const response = await request.post(`${API_BASE}/conversations/${testSessionId}/messages`, {
        data: messageData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData.error).toContain('Message content cannot be empty');
    });

    test('should return 404 for non-existent session', async ({ request }) => {
      const nonExistentSessionId = '00000000-0000-0000-0000-000000000000';
      const messageData = {
        content: 'Test message',
        content_type: 'text'
      };

      const response = await request.post(`${API_BASE}/conversations/${nonExistentSessionId}/messages`, {
        data: messageData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(404);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData.error).toContain('Conversation session not found');
    });
  });

  test.describe('GET /api/v1/conversations/{id}', () => {
    test('should retrieve conversation session with messages', async ({ request }) => {
      const testSessionId = '550e8400-e29b-41d4-a716-446655440002';

      const response = await request.get(`${API_BASE}/conversations/${testSessionId}`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const session = responseData.data;
      expect(session).toHaveProperty('id', testSessionId);
      expect(session).toHaveProperty('chatbot_id');
      expect(session).toHaveProperty('platform');
      expect(session).toHaveProperty('status');
      expect(session).toHaveProperty('start_time');
      expect(session).toHaveProperty('message_count');
      expect(session).toHaveProperty('messages');

      // Validate messages array
      expect(Array.isArray(session.messages)).toBe(true);

      if (session.messages.length > 0) {
        const message = session.messages[0];
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('message_type');
        expect(message).toHaveProperty('content');
        expect(message).toHaveProperty('timestamp');
        expect(message).toHaveProperty('sequence_number');
      }
    });

    test('should support message pagination', async ({ request }) => {
      const testSessionId = '550e8400-e29b-41d4-a716-446655440002';

      const response = await request.get(`${API_BASE}/conversations/${testSessionId}?page=1&limit=10`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      const data = responseData.data;

      expect(data).toHaveProperty('pagination');
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(10);
      expect(data.messages.length).toBeLessThanOrEqual(10);
    });
  });

  test.describe('PUT /api/v1/conversations/{id}', () => {
    test('should update conversation session', async ({ request }) => {
      const testSessionId = '550e8400-e29b-41d4-a716-446655440002';
      const updateData = {
        status: 'inactive',
        user_satisfaction_score: 4,
        session_metadata: {
          feedback: 'Helpful conversation',
          duration_assessment: 'appropriate'
        }
      };

      const response = await request.put(`${API_BASE}/conversations/${testSessionId}`, {
        data: updateData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData.data.status).toBe(updateData.status);
      expect(responseData.data.user_satisfaction_score).toBe(updateData.user_satisfaction_score);
    });

    test('should validate satisfaction score range', async ({ request }) => {
      const testSessionId = '550e8400-e29b-41d4-a716-446655440002';
      const invalidData = {
        user_satisfaction_score: 6  // Invalid: should be 1-5
      };

      const response = await request.put(`${API_BASE}/conversations/${testSessionId}`, {
        data: invalidData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData.error).toContain('Satisfaction score must be between 1 and 5');
    });
  });

  test.describe('GET /api/v1/chatbots/{id}/conversations', () => {
    test('should list conversations for specific chatbot', async ({ request }) => {
      const testChatbotId = '550e8400-e29b-41d4-a716-446655440001';

      const response = await request.get(`${API_BASE}/chatbots/${testChatbotId}/conversations`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const data = responseData.data;
      expect(data).toHaveProperty('conversations');
      expect(data).toHaveProperty('pagination');

      // All conversations should belong to the specified chatbot
      data.conversations.forEach((conversation: any) => {
        expect(conversation.chatbot_id).toBe(testChatbotId);
      });
    });

    test('should support platform filtering', async ({ request }) => {
      const testChatbotId = '550e8400-e29b-41d4-a716-446655440001';
      const platform = 'web';

      const response = await request.get(`${API_BASE}/chatbots/${testChatbotId}/conversations?platform=${platform}`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      const conversations = responseData.data.conversations;

      // All conversations should match the platform filter
      conversations.forEach((conversation: any) => {
        expect(conversation.platform).toBe(platform);
      });
    });
  });
});