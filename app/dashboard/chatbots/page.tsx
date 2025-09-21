'use client';

import { useState, useEffect } from 'react';
import { DashboardPage, DashboardSection } from '@/components/ui/dashboard/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { ChatbotErrorBoundary } from '@/lib/monitoring/sentry-error-boundary';
import ChatbotCreateForm from '@/components/forms/ChatbotCreateForm';
import {
  type ChatbotModel,
  getModelDisplayName,
  getModelBadgeColor,
  getModelCostTier,
  isRecommendedModel,
  getModelDescription,
  MODEL_OPTIONS
} from '@/lib/constants/models';

// Tooltip component for model descriptions
function ModelTooltip({ model, children }: { model: ChatbotModel; children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const description = getModelDescription(model);
  const displayName = getModelDisplayName(model);
  const costTier = getModelCostTier(model);

  if (!description) return <>{children}</>;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap max-w-xs">
          <div className="font-medium">{displayName}</div>
          <div className="text-gray-300 mt-1">{description}</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-gray-400">Cost:</span>
            <span className="font-mono">{costTier}</span>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}

// Using shared model constants from lib/constants/models.ts

interface Chatbot {
  id: string;
  name: string;
  description: string;
  model: ChatbotModel;
  status: 'active' | 'inactive' | 'training' | 'error';
  deployment_status: 'deployed' | 'pending' | 'failed';
  created_at: string;
  updated_at: string;
  conversation_count?: number;
  last_conversation?: string;
  knowledge_products: string[];
  integration_type: 'widget' | 'iframe' | 'api' | 'line-oa';
  performance_score?: number;
  cost_24h?: number;
}

interface ChatbotListProps {
  chatbots: Chatbot[];
  onEdit: (chatbot: Chatbot) => void;
  onDelete: (chatbotId: string) => void;
  onView: (chatbot: Chatbot) => void;
  onConfigure: (chatbot: Chatbot) => void;
  onTest: (chatbot: Chatbot) => void;
}

function ChatbotList({ chatbots, onEdit, onDelete, onView, onConfigure, onTest }: ChatbotListProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'training':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  // Using shared model utility functions

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'line-oa':
        return '💬';
      case 'widget':
        return '🔧';
      case 'iframe':
        return '🖼️';
      case 'api':
        return '⚡';
      default:
        return '🤖';
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {chatbots.map((chatbot) => (
        <Card key={chatbot.id} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ChatBubbleLeftRightIcon className="h-8 w-8 text-primary" />
              <div>
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {chatbot.name}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  {getStatusIcon(chatbot.status)}
                  <span className="text-sm text-gray-500 capitalize">
                    {chatbot.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-lg">{getIntegrationIcon(chatbot.integration_type)}</span>
              <div className={`
                inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                ${chatbot.deployment_status === 'deployed' ? 'bg-green-100 text-green-800' :
                  chatbot.deployment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'}
              `}>
                {chatbot.deployment_status}
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {chatbot.description}
          </p>

          {/* Model and performance metrics */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Model:</span>
              <div className="flex items-center space-x-1">
                {isRecommendedModel(chatbot.model) && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded font-medium">
                    RECOMMENDED
                  </span>
                )}
                <ModelTooltip model={chatbot.model}>
                  <div className="flex items-center space-x-1 cursor-help">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getModelBadgeColor(chatbot.model)}`}>
                      {getModelDisplayName(chatbot.model)}
                    </span>
                    <InformationCircleIcon className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                  </div>
                </ModelTooltip>
                <span className="text-xs text-gray-500 font-mono">
                  {getModelCostTier(chatbot.model)}
                </span>
              </div>
            </div>

            {chatbot.performance_score !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Performance:</span>
                <span className="font-medium text-gray-900">
                  {chatbot.performance_score}%
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Conversations:</span>
              <span className="font-medium text-gray-900">
                {chatbot.conversation_count || 0}
              </span>
            </div>

            {chatbot.cost_24h !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Cost (24h):</span>
                <span className="font-medium text-gray-900">
                  ${chatbot.cost_24h.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Knowledge products */}
          {chatbot.knowledge_products.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-1">Knowledge Base:</div>
              <div className="flex flex-wrap gap-1">
                {chatbot.knowledge_products.slice(0, 2).map((product, index) => (
                  <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {product}
                  </span>
                ))}
                {chatbot.knowledge_products.length > 2 && (
                  <span className="text-xs text-gray-500">
                    +{chatbot.knowledge_products.length - 2} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(chatbot)}
                title="View details"
              >
                <EyeIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(chatbot)}
                title="Edit chatbot"
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onConfigure(chatbot)}
                title="Configure settings"
              >
                <Cog6ToothIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTest(chatbot)}
                title="Test chatbot"
                disabled={chatbot.status !== 'active'}
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(chatbot.id)}
                title="Delete chatbot"
                className="text-red-600 hover:text-red-700"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Last conversation timestamp */}
          <div className="mt-3 text-xs text-gray-400">
            {chatbot.last_conversation ? (
              <span>Last active: {new Date(chatbot.last_conversation).toLocaleString()}</span>
            ) : (
              <span>Created: {new Date(chatbot.created_at).toLocaleString()}</span>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Chatbots Management Page
 *
 * Provides comprehensive chatbot management functionality including:
 * - Chatbot instance listing with status and metrics
 * - Creation wizard for new chatbot instances
 * - Configuration management and deployment tracking
 * - Performance monitoring and cost analysis
 * - Integration type management (Widget, API, Line OA)
 */
export default function ChatbotsPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const mockChatbots: Chatbot[] = [
      {
        id: '1',
        name: 'Customer Support Assistant',
        description: 'AI-powered customer support chatbot for handling common inquiries and escalations',
        model: 'amazon.nova-micro-v1:0',
        status: 'active',
        deployment_status: 'deployed',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-20T15:30:00Z',
        conversation_count: 1247,
        last_conversation: '2024-01-20T14:45:00Z',
        knowledge_products: ['Customer Support KB', 'FAQ Collection'],
        integration_type: 'widget',
        performance_score: 94,
        cost_24h: 3.45 // Lower cost with Nova Micro
      },
      {
        id: '2',
        name: 'Technical Documentation Bot',
        description: 'Specialized bot for answering technical questions about API and product documentation',
        model: 'amazon.nova-lite-v1:0',
        status: 'active',
        deployment_status: 'deployed',
        created_at: '2024-01-10T09:00:00Z',
        updated_at: '2024-01-18T11:20:00Z',
        conversation_count: 678,
        last_conversation: '2024-01-18T16:30:00Z',
        knowledge_products: ['API Documentation', 'Technical Guides'],
        integration_type: 'api',
        performance_score: 91,
        cost_24h: 6.78 // Mid-tier cost with Nova Lite
      },
      {
        id: '3',
        name: 'Advanced Research Assistant',
        description: 'High-capability bot for complex analysis and reasoning tasks',
        model: 'amazon.nova-pro-v1:0',
        status: 'active',
        deployment_status: 'deployed',
        created_at: '2024-01-20T14:00:00Z',
        updated_at: '2024-01-20T16:30:00Z',
        conversation_count: 156,
        last_conversation: '2024-01-20T16:15:00Z',
        knowledge_products: ['Research Database', 'Technical Specifications'],
        integration_type: 'api',
        performance_score: 96,
        cost_24h: 15.23 // Higher cost for premium model
      },
      {
        id: '4',
        name: 'Sales Assistant (LINE)',
        description: 'Thai/English sales support bot integrated with LINE Official Account',
        model: 'amazon.nova-micro-v1:0',
        status: 'training',
        deployment_status: 'pending',
        created_at: '2024-01-20T14:00:00Z',
        updated_at: '2024-01-20T14:00:00Z',
        conversation_count: 0,
        knowledge_products: ['Product Catalog', 'Sales Materials'],
        integration_type: 'line-oa',
        cost_24h: 0
      },
      {
        id: '5',
        name: 'Legacy Help Desk (Migration Needed)',
        description: 'Employee support chatbot using legacy model - migration to Nova recommended',
        model: 'claude-3-haiku',
        status: 'inactive',
        deployment_status: 'failed',
        created_at: '2024-01-12T16:00:00Z',
        updated_at: '2024-01-16T10:15:00Z',
        conversation_count: 23,
        last_conversation: '2024-01-16T09:45:00Z',
        knowledge_products: ['HR Handbook', 'IT Procedures'],
        integration_type: 'iframe',
        performance_score: 67,
        cost_24h: 8.34 // Higher cost for legacy model
      }
    ];

    setTimeout(() => {
      setChatbots(mockChatbots);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredChatbots = chatbots.filter(chatbot => {
    const matchesSearch = chatbot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chatbot.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chatbot.knowledge_products.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || chatbot.status === statusFilter;
    const matchesModel = modelFilter === 'all' || chatbot.model === modelFilter;

    return matchesSearch && matchesStatus && matchesModel;
  });

  const handleCreateNew = () => {
    setShowCreateForm(true);
  };

  const handleCreateSubmit = (data: any) => {
    console.log('Creating chatbot:', data);
    // TODO: Submit to API
    setShowCreateForm(false);
    // Refresh the list or add to existing list
  };

  const handleCreateCancel = () => {
    setShowCreateForm(false);
  };

  const handleEdit = (chatbot: Chatbot) => {
    console.log('Edit chatbot:', chatbot);
    // TODO: Open edit form
  };

  const handleDelete = (chatbotId: string) => {
    console.log('Delete chatbot:', chatbotId);
    setChatbots(prev => prev.filter(c => c.id !== chatbotId));
  };

  const handleView = (chatbot: Chatbot) => {
    console.log('View chatbot:', chatbot);
    // TODO: Open details view
  };

  const handleConfigure = (chatbot: Chatbot) => {
    console.log('Configure chatbot:', chatbot);
    // TODO: Open configuration panel
  };

  const handleTest = (chatbot: Chatbot) => {
    console.log('Test chatbot:', chatbot);
    // TODO: Open test playground
  };

  const getStatusCounts = () => {
    return {
      total: chatbots.length,
      active: chatbots.filter(c => c.status === 'active').length,
      training: chatbots.filter(c => c.status === 'training').length,
      inactive: chatbots.filter(c => c.status === 'inactive').length,
    };
  };

  const statusCounts = getStatusCounts();

  // Show create form if requested
  if (showCreateForm) {
    return (
      <ChatbotErrorBoundary
        tags={{ page: 'chatbots', action: 'create' }}
        context={{ chatbots_count: chatbots.length }}
      >
        <ChatbotCreateForm
          onSubmit={handleCreateSubmit}
          onCancel={handleCreateCancel}
        />
      </ChatbotErrorBoundary>
    );
  }

  return (
    <ChatbotErrorBoundary
      tags={{ page: 'chatbots' }}
      context={{ chatbots_count: chatbots.length, filtered_count: filteredChatbots.length }}
    >
      <DashboardPage
        title="Chatbots"
        description="Create and manage your AI chatbot instances"
        action={
          <Button onClick={handleCreateNew}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Chatbot
          </Button>
        }
      >
        {/* Status Overview */}
        <DashboardSection>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{statusCounts.total}</div>
              <div className="text-sm text-gray-500">Total Chatbots</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-green-600">{statusCounts.active}</div>
              <div className="text-sm text-gray-500">Active</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-yellow-600">{statusCounts.training}</div>
              <div className="text-sm text-gray-500">Training</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-600">{statusCounts.inactive}</div>
              <div className="text-sm text-gray-500">Inactive</div>
            </div>
          </div>
        </DashboardSection>

        {/* Filters and Search */}
        <DashboardSection>
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search chatbots..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="training">Training</option>
                <option value="inactive">Inactive</option>
                <option value="error">Error</option>
              </select>
              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Models</option>
                {MODEL_OPTIONS.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                        {option.isRecommended ? ' ⭐' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
        </DashboardSection>

        {/* Chatbots List */}
        <DashboardSection>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredChatbots.length === 0 ? (
            <div className="text-center py-12">
              <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4 text-gray-500">
                {searchTerm || statusFilter !== 'all' || modelFilter !== 'all'
                  ? 'No chatbots match your filters'
                  : 'No chatbots created yet. Create your first chatbot to get started.'
                }
              </div>
              {(!searchTerm && statusFilter === 'all' && modelFilter === 'all') && (
                <Button className="mt-4" onClick={handleCreateNew}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create First Chatbot
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-sm text-gray-600">
                Showing {filteredChatbots.length} of {chatbots.length} chatbots
              </div>
              <ChatbotList
                chatbots={filteredChatbots}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                onConfigure={handleConfigure}
                onTest={handleTest}
              />
            </div>
          )}
        </DashboardSection>
      </DashboardPage>
    </ChatbotErrorBoundary>
  );
}