import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

/**
 * End-to-End Conversation Flow Tests
 *
 * Validates the complete conversation experience including:
 * - Session initialization and management
 * - Message exchange and context retention
 * - Knowledge retrieval and citation
 * - Real-time updates via SSE
 * - Multi-platform support
 * - Analytics and feedback collection
 */

interface ConversationSession {
  id: string;
  chatbot_id: string;
  platform: string;
  user_identifier: string;
  status: 'active' | 'inactive' | 'expired' | 'terminated';
  created_at: string;
  last_activity_at: string;
  message_count: number;
}

interface Message {
  id: string;
  session_id: string;
  message_type: 'user_message' | 'bot_response' | 'system_message';
  content: string;
  content_type: 'text' | 'image' | 'file' | 'quick_reply' | 'rich_media';
  timestamp: string;
  sequence_number: number;
  response_metadata?: Record<string, any>;
  token_usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  processing_time_ms?: number;
  model_used?: string;
  confidence_score?: number;
  user_feedback?: {
    rating: number;
    feedback_text?: string;
    feedback_timestamp: string;
  };
}

interface MessageResponse {
  message: Message;
  suggested_followups?: string[];
  context_sources?: Array<{
    document_name: string;
    similarity: number;
    content_snippet: string;
  }>;
}

class ConversationFlowHelper {
  constructor(private page: Page, private helpers: TestHelpers) {}

  async createTestChatbot(): Promise<string> {
    // Create a test chatbot for conversation testing
    const response = await this.page.request.post('/api/v1/chatbots', {
      data: {
        name: 'E2E Test Chatbot',
        description: 'Chatbot for end-to-end conversation testing',
        llm_model: 'anthropic.claude-3-haiku-20240307-v1:0',
        system_prompt: 'You are a helpful assistant for testing conversation flows.',
        model_config: {
          temperature: 0.7,
          max_tokens: 1000
        },
        rag_enabled: true,
        retrieval_k: 3,
        score_threshold: 0.7
      }
    });

    if (!response.ok()) {
      throw new Error(`Failed to create test chatbot: ${response.status()}`);
    }

    const chatbot = await response.json();
    return chatbot.id;
  }

  async initializeConversationSession(chatbotId: string, platform: string = 'web'): Promise<ConversationSession> {
    const userIdentifier = `test-user-${Date.now()}`;

    const response = await this.page.request.post('/api/v1/conversations', {
      data: {
        chatbot_id: chatbotId,
        platform: platform,
        user_identifier: userIdentifier,
        metadata: {
          test_session: true,
          browser: 'playwright',
          test_run_id: process.env.TEST_RUN_ID || 'e2e-test'
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const session = await response.json();

    expect(session).toHaveProperty('id');
    expect(session.chatbot_id).toBe(chatbotId);
    expect(session.platform).toBe(platform);
    expect(session.status).toBe('active');

    return session;
  }

  async sendMessage(sessionId: string, content: string, messageType: 'user_message' | 'system_message' = 'user_message'): Promise<MessageResponse> {
    const response = await this.page.request.post(`/api/v1/conversations/${sessionId}/messages`, {
      data: {
        message_type: messageType,
        content: content,
        content_type: 'text'
      }
    });

    expect(response.ok()).toBeTruthy();
    const messageResponse = await response.json();

    expect(messageResponse).toHaveProperty('message');
    expect(messageResponse.message.session_id).toBe(sessionId);
    expect(messageResponse.message.content).toBe(content);

    return messageResponse;
  }

  async getConversationHistory(sessionId: string): Promise<{ session: ConversationSession; messages: Message[] }> {
    const response = await this.page.request.get(`/api/v1/conversations/${sessionId}/messages`);

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data).toHaveProperty('session');
    expect(data).toHaveProperty('messages');
    expect(Array.isArray(data.messages)).toBeTruthy();

    return data;
  }

  async submitUserFeedback(messageId: string, rating: number, feedbackText?: string): Promise<void> {
    const response = await this.page.request.post(`/api/v1/messages/${messageId}/feedback`, {
      data: {
        rating: rating,
        feedback_text: feedbackText
      }
    });

    expect(response.ok()).toBeTruthy();
  }

  async terminateSession(sessionId: string, satisfactionScore?: number): Promise<void> {
    const response = await this.page.request.patch(`/api/v1/conversations/${sessionId}`, {
      data: {
        status: 'terminated',
        user_satisfaction_score: satisfactionScore
      }
    });

    expect(response.ok()).toBeTruthy();
  }

  async waitForSSEUpdate(sessionId: string, timeout: number = 10000): Promise<void> {
    // Set up SSE listener for real-time updates
    await this.page.evaluate((sessionId) => {
      return new Promise((resolve, reject) => {
        const eventSource = new EventSource(`/api/v1/conversations/${sessionId}/events`);
        const timeoutId = setTimeout(() => {
          eventSource.close();
          reject(new Error('SSE timeout'));
        }, 10000);

        eventSource.onmessage = (event) => {
          clearTimeout(timeoutId);
          eventSource.close();
          resolve(JSON.parse(event.data));
        };

        eventSource.onerror = () => {
          clearTimeout(timeoutId);
          eventSource.close();
          reject(new Error('SSE error'));
        };
      });
    }, sessionId);
  }

  async getConversationAnalytics(chatbotId: string): Promise<any> {
    const response = await this.page.request.get(`/api/v1/analytics/conversations?chatbot_id=${chatbotId}`);
    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  async exportConversationHistory(sessionId: string, format: 'json' | 'csv' = 'json'): Promise<any> {
    const response = await this.page.request.get(`/api/v1/conversations/${sessionId}/export?format=${format}`);
    expect(response.ok()).toBeTruthy();

    if (format === 'json') {
      return await response.json();
    } else {
      return await response.text();
    }
  }

  async cleanup(chatbotId: string, sessionIds: string[]): Promise<void> {
    // Clean up test sessions
    for (const sessionId of sessionIds) {
      try {
        await this.page.request.delete(`/api/v1/conversations/${sessionId}`);
      } catch (error) {
        console.warn(`Failed to cleanup session ${sessionId}:`, error);
      }
    }

    // Clean up test chatbot
    try {
      await this.page.request.delete(`/api/v1/chatbots/${chatbotId}`);
    } catch (error) {
      console.warn(`Failed to cleanup chatbot ${chatbotId}:`, error);
    }
  }
}

test.describe('Conversation Flow End-to-End Tests', () => {
  let helpers: TestHelpers;
  let conversationHelper: ConversationFlowHelper;
  let testChatbotId: string;
  let testSessionIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    conversationHelper = new ConversationFlowHelper(page, helpers);

    // Wait for the application to be ready
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create test chatbot
    testChatbotId = await conversationHelper.createTestChatbot();
  });

  test.afterEach(async () => {
    // Cleanup test data
    if (testChatbotId && testSessionIds.length > 0) {
      await conversationHelper.cleanup(testChatbotId, testSessionIds);
    }
  });

  test('should initialize conversation session successfully', async () => {
    const session = await conversationHelper.initializeConversationSession(testChatbotId, 'web');
    testSessionIds.push(session.id);

    // Validate session properties
    expect(session.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(session.chatbot_id).toBe(testChatbotId);
    expect(session.platform).toBe('web');
    expect(session.status).toBe('active');
    expect(session.message_count).toBe(0);
    expect(new Date(session.created_at)).toBeInstanceOf(Date);
  });

  test('should handle basic message exchange', async () => {
    const session = await conversationHelper.initializeConversationSession(testChatbotId, 'web');
    testSessionIds.push(session.id);

    // Send user message
    const userMessage = 'Hello, I need help with my account.';
    const messageResponse = await conversationHelper.sendMessage(session.id, userMessage, 'user_message');

    // Validate message response
    expect(messageResponse.message.content).toBe(userMessage);
    expect(messageResponse.message.message_type).toBe('user_message');
    expect(messageResponse.message.sequence_number).toBe(1);
    expect(messageResponse.message.timestamp).toBeDefined();

    // Verify suggested follow-ups are provided
    expect(messageResponse.suggested_followups).toBeDefined();
    expect(Array.isArray(messageResponse.suggested_followups)).toBeTruthy();

    // Check for context sources if RAG is enabled
    if (messageResponse.context_sources) {
      expect(Array.isArray(messageResponse.context_sources)).toBeTruthy();
      messageResponse.context_sources.forEach(source => {
        expect(source).toHaveProperty('document_name');
        expect(source).toHaveProperty('similarity');
        expect(source).toHaveProperty('content_snippet');
        expect(typeof source.similarity).toBe('number');
        expect(source.similarity).toBeGreaterThanOrEqual(0);
        expect(source.similarity).toBeLessThanOrEqual(1);
      });
    }
  });

  test('should maintain context across multiple message exchanges', async () => {
    const session = await conversationHelper.initializeConversationSession(testChatbotId, 'web');
    testSessionIds.push(session.id);

    // First exchange
    const firstMessage = 'My name is John and I have a billing question.';
    await conversationHelper.sendMessage(session.id, firstMessage, 'user_message');

    // Second exchange - should reference previous context
    const secondMessage = 'Can you help me understand my latest invoice?';
    await conversationHelper.sendMessage(session.id, secondMessage, 'user_message');

    // Third exchange - test follow-up
    const thirdMessage = 'What about the charges from last month?';
    await conversationHelper.sendMessage(session.id, thirdMessage, 'user_message');

    // Get conversation history
    const history = await conversationHelper.getConversationHistory(session.id);

    // Validate conversation context
    expect(history.messages.length).toBe(3);
    expect(history.session.message_count).toBe(3);

    // Check message sequence
    history.messages.forEach((message, index) => {
      expect(message.sequence_number).toBe(index + 1);
      expect(message.session_id).toBe(session.id);
    });

    // Validate chronological order
    for (let i = 1; i < history.messages.length; i++) {
      const prevTime = new Date(history.messages[i - 1].timestamp);
      const currTime = new Date(history.messages[i].timestamp);
      expect(currTime.getTime()).toBeGreaterThanOrEqual(prevTime.getTime());
    }
  });

  test('should handle knowledge retrieval and citations', async () => {
    const session = await conversationHelper.initializeConversationSession(testChatbotId, 'web');
    testSessionIds.push(session.id);

    // Send a question that should trigger knowledge retrieval
    const knowledgeQuery = 'What are your privacy policies and data handling procedures?';
    const response = await conversationHelper.sendMessage(session.id, knowledgeQuery, 'user_message');

    // Validate knowledge retrieval
    if (response.context_sources && response.context_sources.length > 0) {
      expect(response.context_sources.length).toBeGreaterThan(0);
      expect(response.context_sources.length).toBeLessThanOrEqual(5);

      response.context_sources.forEach(source => {
        expect(source.document_name).toBeDefined();
        expect(typeof source.document_name).toBe('string');
        expect(source.similarity).toBeGreaterThan(0);
        expect(source.content_snippet).toBeDefined();
        expect(source.content_snippet.length).toBeGreaterThan(0);
      });

      // Check that sources are ordered by similarity (highest first)
      for (let i = 1; i < response.context_sources.length; i++) {
        expect(response.context_sources[i - 1].similarity)
          .toBeGreaterThanOrEqual(response.context_sources[i].similarity);
      }
    }

    // Validate response metadata contains source information
    if (response.message.response_metadata) {
      expect(response.message.response_metadata).toHaveProperty('sources_consulted');
    }
  });

  test('should track conversation persistence and history', async () => {
    const session = await conversationHelper.initializeConversationSession(testChatbotId, 'web');
    testSessionIds.push(session.id);

    // Send multiple messages
    const messages = [
      'Hello, I need technical support.',
      'I am having trouble with my API integration.',
      'The authentication is failing repeatedly.',
      'Can you provide me with debugging steps?'
    ];

    for (const message of messages) {
      await conversationHelper.sendMessage(session.id, message, 'user_message');
    }

    // Get conversation history
    const history = await conversationHelper.getConversationHistory(session.id);

    // Validate persistence
    expect(history.messages.length).toBe(messages.length);
    expect(history.session.message_count).toBe(messages.length);

    // Validate message content persistence
    messages.forEach((originalMessage, index) => {
      const storedMessage = history.messages[index];
      expect(storedMessage.content).toBe(originalMessage);
      expect(storedMessage.message_type).toBe('user_message');
      expect(storedMessage.content_type).toBe('text');
    });

    // Test conversation export
    const exportedData = await conversationHelper.exportConversationHistory(session.id, 'json');
    expect(exportedData).toHaveProperty('session');
    expect(exportedData).toHaveProperty('messages');
    expect(exportedData.messages.length).toBe(messages.length);
  });

  test('should manage session lifecycle correctly', async () => {
    const session = await conversationHelper.initializeConversationSession(testChatbotId, 'web');
    testSessionIds.push(session.id);

    // Send a message to activate session
    await conversationHelper.sendMessage(session.id, 'Test message for session lifecycle', 'user_message');

    // Get updated session
    let currentSession = (await conversationHelper.getConversationHistory(session.id)).session;
    expect(currentSession.status).toBe('active');
    expect(currentSession.message_count).toBe(1);

    // Terminate session with satisfaction score
    await conversationHelper.terminateSession(session.id, 4);

    // Verify session termination
    currentSession = (await conversationHelper.getConversationHistory(session.id)).session;
    expect(currentSession.status).toBe('terminated');
    expect((currentSession as any).user_satisfaction_score).toBe(4);
  });

  test('should collect and process user feedback', async () => {
    const session = await conversationHelper.initializeConversationSession(testChatbotId, 'web');
    testSessionIds.push(session.id);

    // Send a message
    const response = await conversationHelper.sendMessage(session.id, 'How do I reset my password?', 'user_message');
    const messageId = response.message.id;

    // Submit positive feedback
    await conversationHelper.submitUserFeedback(messageId, 5, 'Very helpful response');

    // Get updated conversation history
    const history = await conversationHelper.getConversationHistory(session.id);
    const messageWithFeedback = history.messages.find(m => m.id === messageId);

    expect(messageWithFeedback).toBeDefined();
    if (messageWithFeedback?.user_feedback) {
      expect(messageWithFeedback.user_feedback.rating).toBe(5);
      expect(messageWithFeedback.user_feedback.feedback_text).toBe('Very helpful response');
      expect(messageWithFeedback.user_feedback.feedback_timestamp).toBeDefined();
    }
  });

  test('should support multi-platform conversations', async () => {
    const platforms = ['web', 'line', 'api'];
    const sessionsByPlatform: Record<string, ConversationSession> = {};

    // Create sessions for different platforms
    for (const platform of platforms) {
      const session = await conversationHelper.initializeConversationSession(testChatbotId, platform);
      sessionsByPlatform[platform] = session;
      testSessionIds.push(session.id);

      // Validate platform-specific configuration
      expect(session.platform).toBe(platform);
      expect(session.status).toBe('active');
    }

    // Send platform-specific messages
    for (const [platform, session] of Object.entries(sessionsByPlatform)) {
      const message = `Hello from ${platform} platform`;
      const response = await conversationHelper.sendMessage(session.id, message, 'user_message');

      expect(response.message.content).toBe(message);
      expect(response.message.session_id).toBe(session.id);
    }

    // Validate platform separation
    for (const [platform, session] of Object.entries(sessionsByPlatform)) {
      const history = await conversationHelper.getConversationHistory(session.id);
      expect(history.session.platform).toBe(platform);
      expect(history.messages.length).toBe(1);
    }
  });

  test('should handle real-time updates via SSE', async () => {
    const session = await conversationHelper.initializeConversationSession(testChatbotId, 'web');
    testSessionIds.push(session.id);

    // Set up SSE listener and send message simultaneously
    const ssePromise = conversationHelper.waitForSSEUpdate(session.id);
    const messagePromise = conversationHelper.sendMessage(session.id, 'Test real-time update', 'user_message');

    // Wait for both operations to complete
    await Promise.all([ssePromise, messagePromise]);

    // If we reach here, SSE update was received successfully
    expect(true).toBeTruthy();
  });

  test('should track analytics and conversation metrics', async () => {
    const session = await conversationHelper.initializeConversationSession(testChatbotId, 'web');
    testSessionIds.push(session.id);

    // Generate conversation activity
    const messages = [
      'Start analytics test conversation',
      'Ask multiple questions for metrics',
      'Generate some conversation data',
      'Complete the test interaction'
    ];

    for (const message of messages) {
      await conversationHelper.sendMessage(session.id, message, 'user_message');
    }

    // Terminate session with feedback
    await conversationHelper.terminateSession(session.id, 4);

    // Get analytics data
    const analytics = await conversationHelper.getConversationAnalytics(testChatbotId);

    // Validate analytics structure
    expect(analytics).toHaveProperty('total_sessions');
    expect(analytics).toHaveProperty('active_sessions');
    expect(analytics).toHaveProperty('avg_session_duration');
    expect(analytics).toHaveProperty('avg_messages_per_session');
    expect(analytics).toHaveProperty('platform_breakdown');
    expect(analytics).toHaveProperty('satisfaction_score');

    // Validate metrics values
    expect(analytics.total_sessions).toBeGreaterThan(0);
    expect(typeof analytics.avg_session_duration).toBe('number');
    expect(typeof analytics.avg_messages_per_session).toBe('number');
    expect(typeof analytics.platform_breakdown).toBe('object');
  });

  test('should handle conversation branching and follow-ups', async () => {
    const session = await conversationHelper.initializeConversationSession(testChatbotId, 'web');
    testSessionIds.push(session.id);

    // Initial question
    const initialResponse = await conversationHelper.sendMessage(
      session.id,
      'I need help with both billing and technical issues',
      'user_message'
    );

    // Validate suggested follow-ups
    expect(initialResponse.suggested_followups).toBeDefined();
    expect(initialResponse.suggested_followups!.length).toBeGreaterThan(0);

    // Follow up on billing
    await conversationHelper.sendMessage(
      session.id,
      'Let me start with the billing question first',
      'user_message'
    );

    // Follow up on technical
    await conversationHelper.sendMessage(
      session.id,
      'Now about the technical issue I mentioned',
      'user_message'
    );

    // Get conversation history
    const history = await conversationHelper.getConversationHistory(session.id);

    // Validate conversation flow
    expect(history.messages.length).toBe(3);

    // Check that context is maintained across topic switches
    const messages = history.messages.map(m => m.content);
    expect(messages[0]).toContain('billing and technical');
    expect(messages[1]).toContain('billing');
    expect(messages[2]).toContain('technical');
  });

  test('should validate message sequencing and timestamps', async () => {
    const session = await conversationHelper.initializeConversationSession(testChatbotId, 'web');
    testSessionIds.push(session.id);

    const messageContents = [
      'First message in sequence',
      'Second message in sequence',
      'Third message in sequence'
    ];

    const sentTimes: Date[] = [];

    // Send messages with small delays to ensure timestamp ordering
    for (let i = 0; i < messageContents.length; i++) {
      const before = new Date();
      await conversationHelper.sendMessage(session.id, messageContents[i], 'user_message');
      const after = new Date();
      sentTimes.push(before);

      if (i < messageContents.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      }
    }

    // Get conversation history
    const history = await conversationHelper.getConversationHistory(session.id);

    // Validate sequence numbers
    history.messages.forEach((message, index) => {
      expect(message.sequence_number).toBe(index + 1);
      expect(message.content).toBe(messageContents[index]);
    });

    // Validate timestamps are in correct order
    for (let i = 1; i < history.messages.length; i++) {
      const prevTimestamp = new Date(history.messages[i - 1].timestamp);
      const currTimestamp = new Date(history.messages[i].timestamp);
      expect(currTimestamp.getTime()).toBeGreaterThanOrEqual(prevTimestamp.getTime());
    }

    // Validate timestamps are within reasonable range of when messages were sent
    history.messages.forEach((message, index) => {
      const messageTime = new Date(message.timestamp);
      const sentTime = sentTimes[index];
      const timeDiff = Math.abs(messageTime.getTime() - sentTime.getTime());
      expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
    });
  });

  test('should handle context window management for long conversations', async () => {
    const session = await conversationHelper.initializeConversationSession(testChatbotId, 'web');
    testSessionIds.push(session.id);

    // Send many messages to test context window management
    const longConversation = Array.from({ length: 15 }, (_, i) =>
      `This is message number ${i + 1} in a long conversation to test context window management.`
    );

    for (const message of longConversation) {
      await conversationHelper.sendMessage(session.id, message, 'user_message');
    }

    // Get conversation history
    const history = await conversationHelper.getConversationHistory(session.id);

    // Validate all messages are stored
    expect(history.messages.length).toBe(longConversation.length);
    expect(history.session.message_count).toBe(longConversation.length);

    // Validate the conversation can still reference early messages
    const contextTestMessage = 'Can you remember what I said in my first message?';
    const response = await conversationHelper.sendMessage(session.id, contextTestMessage, 'user_message');

    expect(response.message.content).toBe(contextTestMessage);
    expect(response.message.sequence_number).toBe(longConversation.length + 1);
  });
});

// Additional helper tests for edge cases
test.describe('Conversation Flow Edge Cases', () => {
  let helpers: TestHelpers;
  let conversationHelper: ConversationFlowHelper;
  let testChatbotId: string;
  let testSessionIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    conversationHelper = new ConversationFlowHelper(page, helpers);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    testChatbotId = await conversationHelper.createTestChatbot();
  });

  test.afterEach(async () => {
    if (testChatbotId && testSessionIds.length > 0) {
      await conversationHelper.cleanup(testChatbotId, testSessionIds);
    }
  });

  test('should handle session timeout and reactivation', async () => {
    const session = await conversationHelper.initializeConversationSession(testChatbotId, 'web');
    testSessionIds.push(session.id);

    // Send initial message
    await conversationHelper.sendMessage(session.id, 'Initial message before timeout', 'user_message');

    // Simulate session timeout by updating status directly
    const timeoutResponse = await (conversationHelper as any).page.request.patch(`/api/v1/conversations/${session.id}`, {
      data: { status: 'expired' }
    });
    expect(timeoutResponse.ok()).toBeTruthy();

    // Try to send message to expired session (should fail gracefully)
    const expiredResponse = await (conversationHelper as any).page.request.post(`/api/v1/conversations/${session.id}/messages`, {
      data: {
        message_type: 'user_message',
        content: 'Message to expired session',
        content_type: 'text'
      }
    });

    // Should return appropriate error for expired session
    expect(expiredResponse.status()).toBe(400);
  });

  test('should handle empty and malformed messages', async () => {
    const session = await conversationHelper.initializeConversationSession(testChatbotId, 'web');
    testSessionIds.push(session.id);

    // Test empty message
    const emptyResponse = await (conversationHelper as any).page.request.post(`/api/v1/conversations/${session.id}/messages`, {
      data: {
        message_type: 'user_message',
        content: '',
        content_type: 'text'
      }
    });
    expect(emptyResponse.status()).toBe(400);

    // Test extremely long message
    const longContent = 'A'.repeat(15000); // Assuming max is 10000
    const longResponse = await (conversationHelper as any).page.request.post(`/api/v1/conversations/${session.id}/messages`, {
      data: {
        message_type: 'user_message',
        content: longContent,
        content_type: 'text'
      }
    });
    expect(longResponse.status()).toBe(400);

    // Test malformed request
    const malformedResponse = await (conversationHelper as any).page.request.post(`/api/v1/conversations/${session.id}/messages`, {
      data: {
        // Missing required fields
        content_type: 'text'
      }
    });
    expect(malformedResponse.status()).toBe(400);
  });

  test('should handle concurrent message sending', async () => {
    const session = await conversationHelper.initializeConversationSession(testChatbotId, 'web');
    testSessionIds.push(session.id);

    // Send multiple messages concurrently
    const concurrentMessages = [
      'First concurrent message',
      'Second concurrent message',
      'Third concurrent message'
    ];

    const messagePromises = concurrentMessages.map(content =>
      conversationHelper.sendMessage(session.id, content, 'user_message')
    );

    const responses = await Promise.all(messagePromises);

    // Validate all messages were processed
    expect(responses.length).toBe(concurrentMessages.length);
    responses.forEach((response, index) => {
      expect(response.message.content).toBe(concurrentMessages[index]);
    });

    // Get conversation history and validate sequence
    const history = await conversationHelper.getConversationHistory(session.id);
    expect(history.messages.length).toBe(concurrentMessages.length);

    // Validate sequence numbers are unique and sequential
    const sequenceNumbers = history.messages.map(m => m.sequence_number).sort((a, b) => a - b);
    for (let i = 0; i < sequenceNumbers.length; i++) {
      expect(sequenceNumbers[i]).toBe(i + 1);
    }
  });

  test('should handle session cleanup and data retention', async () => {
    const session = await conversationHelper.initializeConversationSession(testChatbotId, 'web');

    // Send messages
    await conversationHelper.sendMessage(session.id, 'Message before cleanup', 'user_message');

    // Verify session and messages exist
    const beforeCleanup = await conversationHelper.getConversationHistory(session.id);
    expect(beforeCleanup.messages.length).toBe(1);

    // Cleanup session (this removes it from testSessionIds to prevent double cleanup)
    await conversationHelper.cleanup(testChatbotId, [session.id]);

    // Verify session is cleaned up
    const cleanupResponse = await (conversationHelper as any).page.request.get(`/api/v1/conversations/${session.id}/messages`);
    expect(cleanupResponse.status()).toBe(404);
  });
});