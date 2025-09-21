'use client';

import { useState, useRef, useEffect } from 'react';
import { DashboardPage, DashboardSection } from '@/components/ui/dashboard/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  PaperAirplaneIcon,
  UserIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  Cog6ToothIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { ChatbotErrorBoundary } from '@/lib/monitoring/sentry-error-boundary';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
  metadata?: {
    model?: string;
    tokens_used?: number;
    response_time?: number;
    confidence?: number;
    sources?: string[];
  };
}

interface Conversation {
  id: string;
  title: string;
  chatbot_id: string;
  chatbot_name: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

interface MessageBubbleProps {
  message: Message;
  isLatest: boolean;
}

function MessageBubble({ message, isLatest }: MessageBubbleProps) {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';

  const getStatusIcon = () => {
    if (message.status === 'sending') {
      return <ClockIcon className="h-3 w-3 text-gray-400 animate-spin" />;
    } else if (message.status === 'error') {
      return <ExclamationTriangleIcon className="h-3 w-3 text-red-500" />;
    } else if (message.status === 'sent') {
      return <CheckCircleIcon className="h-3 w-3 text-green-500" />;
    }
    return null;
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-full max-w-md text-center">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center
            ${isUser ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-600'}
          `}>
            {isUser ? (
              <UserIcon className="h-4 w-4" />
            ) : (
              <UserIcon className="h-4 w-4" />
            )}
          </div>
        </div>

        {/* Message content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`
            px-4 py-3 rounded-lg max-w-md lg:max-w-2xl
            ${isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-white border border-gray-200 text-gray-900'
            }
            ${message.status === 'error' ? 'border-red-300 bg-red-50' : ''}
          `}>
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          </div>

          {/* Message metadata */}
          <div className={`flex items-center space-x-2 mt-1 text-xs text-gray-500 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
            {getStatusIcon()}

            {message.metadata && (
              <>
                {message.metadata.response_time && (
                  <span>• {message.metadata.response_time}ms</span>
                )}
                {message.metadata.tokens_used && (
                  <span>• {message.metadata.tokens_used} tokens</span>
                )}
                {message.metadata.confidence && (
                  <span>• {Math.round(message.metadata.confidence * 100)}% confidence</span>
                )}
              </>
            )}
          </div>

          {/* Sources */}
          {message.metadata?.sources && message.metadata.sources.length > 0 && (
            <div className="mt-2 text-xs">
              <div className="text-gray-500 mb-1">Sources:</div>
              <div className="flex flex-wrap gap-1">
                {message.metadata.sources.map((source, index) => (
                  <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                    {source}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ChatInterfaceProps {
  conversation: Conversation | null;
  onSendMessage: (content: string) => void;
  loading: boolean;
}

function ChatInterface({ conversation, onSendMessage, loading }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !loading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      {conversation && (
        <div className="border-b border-gray-200 p-4 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">{conversation.chatbot_name}</h3>
              <p className="text-sm text-gray-500">
                {conversation.messages.length} messages • {conversation.title}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" title="Copy conversation">
                <DocumentDuplicateIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" title="Clear conversation">
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {conversation ? (
          <div className="space-y-4">
            {conversation.messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLatest={index === conversation.messages.length - 1}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>Select a chatbot to start testing conversations</p>
            </div>
          </div>
        )}
      </div>

      {/* Message input */}
      {conversation && (
        <div className="border-t border-gray-200 p-4 bg-white">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className="px-4"
            >
              {loading ? (
                <ClockIcon className="h-4 w-4 animate-spin" />
              ) : (
                <PaperAirplaneIcon className="h-4 w-4" />
              )}
            </Button>
          </form>
          <div className="mt-2 text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Conversation Playground Page
 *
 * Provides a real-time testing environment for chatbot interactions including:
 * - Chatbot selection and configuration
 * - Real-time message exchange interface
 * - Conversation history and management
 * - Performance metrics and debugging info
 * - Source attribution and confidence scores
 */
export default function PlaygroundPage() {
  const [selectedChatbot, setSelectedChatbot] = useState<string>('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [availableChatbots] = useState([
    { id: '1', name: 'Customer Support Assistant', status: 'active' },
    { id: '2', name: 'Technical Documentation Bot', status: 'active' },
    { id: '3', name: 'Sales Assistant (LINE)', status: 'training' },
    { id: '4', name: 'Internal Help Desk', status: 'inactive' },
  ]);

  const createNewConversation = (chatbotId: string) => {
    const chatbot = availableChatbots.find(c => c.id === chatbotId);
    if (!chatbot) return;

    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'New Conversation',
      chatbot_id: chatbotId,
      chatbot_name: chatbot.name,
      messages: [
        {
          id: 'system-1',
          type: 'system',
          content: `Connected to ${chatbot.name}. Start typing to begin the conversation.`,
          timestamp: new Date().toISOString(),
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setConversation(newConversation);
  };

  const handleChatbotChange = (chatbotId: string) => {
    setSelectedChatbot(chatbotId);
    if (chatbotId) {
      createNewConversation(chatbotId);
    } else {
      setConversation(null);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!conversation) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content,
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    // Add user message
    setConversation(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMessage],
      updated_at: new Date().toISOString(),
    } : null);

    setLoading(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      // Generate mock response
      const responses = [
        "I understand your question. Let me help you with that. Based on the information in our knowledge base, here's what I found...",
        "Thank you for your inquiry. I've searched through the relevant documents and found several helpful resources that address your question.",
        "I can assist you with that. According to our documentation, the best approach would be to follow these steps...",
        "That's a great question! I've found some relevant information that should help clarify this for you.",
        "I notice you're asking about a specific feature. Let me provide you with the most up-to-date information from our knowledge base.",
      ];

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        type: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString(),
        status: 'sent',
        metadata: {
          model: 'claude-3-haiku',
          tokens_used: Math.floor(Math.random() * 150) + 50,
          response_time: Math.floor(Math.random() * 1500) + 500,
          confidence: 0.7 + Math.random() * 0.3,
          sources: [
            'Customer Support Manual.pdf',
            'FAQ Collection.docx',
          ].slice(0, Math.floor(Math.random() * 2) + 1),
        },
      };

      setConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, assistantMessage],
        updated_at: new Date().toISOString(),
      } : null);

    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date().toISOString(),
        status: 'error',
      };

      setConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, errorMessage],
        updated_at: new Date().toISOString(),
      } : null);
    } finally {
      setLoading(false);
    }
  };

  const handleClearConversation = () => {
    if (selectedChatbot) {
      createNewConversation(selectedChatbot);
    }
  };

  return (
    <ChatbotErrorBoundary
      tags={{ page: 'playground' }}
      context={{ chatbot_id: selectedChatbot, conversation_id: conversation?.id }}
    >
      <DashboardPage
        title="Playground"
        description="Test and interact with your chatbot instances in real-time"
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
          {/* Chatbot Selection Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-4 h-full">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Select Chatbot</h3>
                  <select
                    value={selectedChatbot}
                    onChange={(e) => handleChatbotChange(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Choose a chatbot...</option>
                    {availableChatbots.map((chatbot) => (
                      <option
                        key={chatbot.id}
                        value={chatbot.id}
                        disabled={chatbot.status !== 'active'}
                      >
                        {chatbot.name} ({chatbot.status})
                      </option>
                    ))}
                  </select>
                </div>

                {conversation && (
                  <>
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Conversation Info</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div>Messages: {conversation.messages.filter(m => m.type !== 'system').length}</div>
                        <div>Started: {new Date(conversation.created_at).toLocaleTimeString()}</div>
                        <div>Updated: {new Date(conversation.updated_at).toLocaleTimeString()}</div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Actions</h4>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearConversation}
                          className="w-full"
                        >
                          <TrashIcon className="h-4 w-4 mr-2" />
                          Clear Chat
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Cog6ToothIcon className="h-4 w-4 mr-2" />
                          Settings
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Quick test prompts */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Quick Tests</h4>
                  <div className="space-y-1">
                    {[
                      "How can I reset my password?",
                      "What are your business hours?",
                      "How do I contact support?",
                      "Tell me about your return policy",
                    ].map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => handleSendMessage(prompt)}
                        disabled={!conversation || loading}
                        className="w-full text-left text-xs text-gray-600 hover:text-gray-900 p-2 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        "{prompt}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <Card className="h-full flex flex-col">
              <ChatInterface
                conversation={conversation}
                onSendMessage={handleSendMessage}
                loading={loading}
              />
            </Card>
          </div>
        </div>
      </DashboardPage>
    </ChatbotErrorBoundary>
  );
}