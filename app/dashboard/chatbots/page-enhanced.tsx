'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  EnhancedDashboardPage,
  EnhancedDashboardSection,
  StatsGrid
} from '@/components/ui/dashboard/layout-enhanced';
import {
  Button,
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  ArrowTopRightOnSquareIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { ChatbotErrorBoundary } from '@/lib/monitoring/sentry-error-boundary';
import {
  ChatbotCardSkeleton,
  NoChatbotsEmpty,
  FilteredResultsEmpty
} from '@/components/ui';
import { ChatbotStatus } from '@/components/ui';
import { Typography, FormLabel } from '@/components/ui';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

// Enhanced Chatbot interface with more detailed information
interface Chatbot {
  id: string;
  name: string;
  description: string;
  model: ChatbotModel;
  status: 'active' | 'inactive' | 'training' | 'error' | 'paused';
  deployment_status: 'deployed' | 'pending' | 'failed' | 'deploying';
  created_at: string;
  updated_at: string;
  conversation_count?: number;
  last_conversation?: string;
  knowledge_products: string[];
  integration_type: 'widget' | 'iframe' | 'api' | 'line-oa';
  performance_score?: number;
  cost_24h?: number;
  response_time_avg?: number;
  satisfaction_score?: number;
  language_support: ('en' | 'th')[];
}

interface ChatbotCardProps {
  chatbot: Chatbot;
  onEdit: (chatbot: Chatbot) => void;
  onDelete: (chatbotId: string) => void;
  onView: (chatbot: Chatbot) => void;
  onConfigure: (chatbot: Chatbot) => void;
  onTest: (chatbot: Chatbot) => void;
  viewMode: 'card' | 'list';
}

function EnhancedChatbotCard({
  chatbot,
  onEdit,
  onDelete,
  onView,
  onConfigure,
  onTest,
  viewMode = 'card'
}: ChatbotCardProps) {
  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'line-oa': return '💬';
      case 'widget': return '🔧';
      case 'iframe': return '🖼️';
      case 'api': return '⚡';
      default: return '🤖';
    }
  };

  const getLanguageFlags = (languages: string[]) => {
    return languages.map(lang => lang === 'en' ? '🇺🇸' : '🇹🇭').join(' ');
  };

  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Typography variant="h6" className="truncate">
                    {chatbot.name}
                  </Typography>
                  <Badge variant="outline" className="text-xs">
                    {getIntegrationIcon(chatbot.integration_type)}
                  </Badge>
                  <span className="text-sm">{getLanguageFlags(chatbot.language_support)}</span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <ChatbotStatus
                    status={chatbot.status}
                    deploymentStatus={chatbot.deployment_status}
                  />
                  <span>{getModelDisplayName(chatbot.model)}</span>
                  <span>{chatbot.conversation_count || 0} conversations</span>
                  {chatbot.cost_24h !== undefined && (
                    <span>${chatbot.cost_24h.toFixed(2)}/day</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => onView(chatbot)}>
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>View details</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(chatbot)}>
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Edit chatbot</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onTest(chatbot)}
                      disabled={chatbot.status !== 'active'}
                    >
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Test chatbot</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ChatBubbleLeftRightIcon className="h-6 w-6" />
            </div>
            <div>
              <Typography variant="h5" className="group-hover:text-primary transition-colors">
                {chatbot.name}
              </Typography>
              <div className="flex items-center space-x-2 mt-1">
                <ChatbotStatus
                  status={chatbot.status}
                  deploymentStatus={chatbot.deployment_status}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {getIntegrationIcon(chatbot.integration_type)}
            </Badge>
            <span className="text-lg">{getLanguageFlags(chatbot.language_support)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Typography variant="small" color="muted" className="line-clamp-2">
          {chatbot.description}
        </Typography>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <div className="text-gray-500">Model</div>
            <div className="flex items-center gap-1">
              <Badge
                variant="outline"
                className={`text-xs ${getModelBadgeColor(chatbot.model)}`}
              >
                {getModelDisplayName(chatbot.model)}
              </Badge>
              {isRecommendedModel(chatbot.model) && (
                <Badge variant="secondary" className="text-xs">⭐</Badge>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-gray-500">Conversations</div>
            <div className="font-medium">{(chatbot.conversation_count || 0).toLocaleString()}</div>
          </div>

          {chatbot.performance_score && (
            <div className="space-y-1">
              <div className="text-gray-500">Performance</div>
              <div className="font-medium">{chatbot.performance_score}%</div>
            </div>
          )}

          {chatbot.cost_24h !== undefined && (
            <div className="space-y-1">
              <div className="text-gray-500">Daily Cost</div>
              <div className="font-medium">${chatbot.cost_24h.toFixed(2)}</div>
            </div>
          )}
        </div>

        {/* Knowledge Base */}
        {chatbot.knowledge_products.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-500">Knowledge Base</div>
            <div className="flex flex-wrap gap-1">
              {chatbot.knowledge_products.slice(0, 2).map((product, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {product}
                </Badge>
              ))}
              {chatbot.knowledge_products.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{chatbot.knowledge_products.length - 2} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => onView(chatbot)}>
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>View details</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => onEdit(chatbot)}>
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Edit chatbot</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => onConfigure(chatbot)}>
                    <Cog6ToothIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Configure settings</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTest(chatbot)}
              disabled={chatbot.status !== 'active'}
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
              Test
            </Button>
          </div>
        </div>

        {/* Last activity */}
        <div className="text-xs text-gray-400 pt-2 border-t">
          {chatbot.last_conversation ? (
            <>Last active: {new Date(chatbot.last_conversation).toLocaleString()}</>
          ) : (
            <>Created: {new Date(chatbot.created_at).toLocaleString()}</>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Enhanced Chatbots Management Page
 *
 * Modern, responsive chatbot management with improved UX,
 * loading states, empty states, and accessibility.
 */
export default function EnhancedChatbotsPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [integrationFilter, setIntegrationFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Enhanced mock data
  useEffect(() => {
    const mockChatbots: Chatbot[] = [
      {
        id: '1',
        name: 'Customer Support Assistant',
        description: 'AI-powered customer support chatbot for handling common inquiries, escalations, and multi-language support',
        model: 'amazon.nova-micro-v1:0',
        status: 'active',
        deployment_status: 'deployed',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-20T15:30:00Z',
        conversation_count: 1247,
        last_conversation: '2024-01-20T14:45:00Z',
        knowledge_products: ['Customer Support KB', 'FAQ Collection', 'Product Guides'],
        integration_type: 'widget',
        performance_score: 94,
        cost_24h: 3.45,
        response_time_avg: 1.2,
        satisfaction_score: 4.6,
        language_support: ['en', 'th'],
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
        cost_24h: 6.78,
        response_time_avg: 0.8,
        satisfaction_score: 4.8,
        language_support: ['en'],
      },
      {
        id: '3',
        name: 'Advanced Research Assistant',
        description: 'High-capability bot for complex analysis and reasoning tasks with premium model',
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
        cost_24h: 15.23,
        response_time_avg: 2.1,
        satisfaction_score: 4.9,
        language_support: ['en'],
      },
      {
        id: '4',
        name: 'Sales Assistant (LINE)',
        description: 'Thai/English sales support bot integrated with LINE Official Account for customer engagement',
        model: 'amazon.nova-micro-v1:0',
        status: 'training',
        deployment_status: 'pending',
        created_at: '2024-01-20T14:00:00Z',
        updated_at: '2024-01-20T14:00:00Z',
        conversation_count: 0,
        knowledge_products: ['Product Catalog', 'Sales Materials', 'Pricing Guide'],
        integration_type: 'line-oa',
        cost_24h: 0,
        language_support: ['th', 'en'],
      },
      {
        id: '5',
        name: 'Legacy Help Desk (Migration Needed)',
        description: 'Employee support chatbot using legacy model - migration to Nova recommended for better performance',
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
        cost_24h: 8.34,
        response_time_avg: 3.4,
        satisfaction_score: 3.2,
        language_support: ['en'],
      }
    ];

    setTimeout(() => {
      setChatbots(mockChatbots);
      setLoading(false);
    }, 1500);
  }, []);

  // Filtering logic
  const filteredChatbots = chatbots.filter(chatbot => {
    const matchesSearch =
      chatbot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chatbot.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chatbot.knowledge_products.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || chatbot.status === statusFilter;
    const matchesModel = modelFilter === 'all' || chatbot.model === modelFilter;
    const matchesIntegration = integrationFilter === 'all' || chatbot.integration_type === integrationFilter;

    return matchesSearch && matchesStatus && matchesModel && matchesIntegration;
  });

  // Stats calculation
  const getStatusCounts = () => {
    return {
      total: chatbots.length,
      active: chatbots.filter(c => c.status === 'active').length,
      training: chatbots.filter(c => c.status === 'training').length,
      inactive: chatbots.filter(c => c.status === 'inactive').length,
    };
  };

  const getPerformanceStats = () => {
    const activeBots = chatbots.filter(c => c.status === 'active');
    const totalConversations = activeBots.reduce((sum, bot) => sum + (bot.conversation_count || 0), 0);
    const totalCost = activeBots.reduce((sum, bot) => sum + (bot.cost_24h || 0), 0);
    const avgPerformance = activeBots.length > 0
      ? activeBots.reduce((sum, bot) => sum + (bot.performance_score || 0), 0) / activeBots.length
      : 0;

    return { totalConversations, totalCost, avgPerformance };
  };

  const statusCounts = getStatusCounts();
  const { totalConversations, totalCost, avgPerformance } = getPerformanceStats();

  // Event handlers
  const handleCreateNew = () => setShowCreateForm(true);
  const handleCreateSubmit = (data: any) => {
    console.log('Creating chatbot:', data);
    setShowCreateForm(false);
  };
  const handleCreateCancel = () => setShowCreateForm(false);
  const handleEdit = (chatbot: Chatbot) => console.log('Edit chatbot:', chatbot);
  const handleDelete = (chatbotId: string) => {
    setChatbots(prev => prev.filter(c => c.id !== chatbotId));
  };
  const handleView = (chatbot: Chatbot) => console.log('View chatbot:', chatbot);
  const handleConfigure = (chatbot: Chatbot) => console.log('Configure chatbot:', chatbot);
  const handleTest = (chatbot: Chatbot) => console.log('Test chatbot:', chatbot);

  // Show create form
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
      <EnhancedDashboardPage
        title="Chatbots"
        description="Create and manage your AI chatbot instances with advanced analytics and performance monitoring"
        loading={loading}
        loadingType="chatbots"
        breadcrumbs={[
          { name: 'Dashboard', href: '/dashboard' },
          { name: 'Chatbots', current: true }
        ]}
        badge={{
          text: `${statusCounts.active} active`,
          variant: statusCounts.active > 0 ? 'default' : 'outline'
        }}
        action={
          <Button onClick={handleCreateNew}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Chatbot
          </Button>
        }
      >
        {!loading && (
          <>
            {/* Performance Statistics */}
            <EnhancedDashboardSection title="Performance Overview">
              <StatsGrid
                stats={[
                  {
                    title: 'Total Chatbots',
                    value: statusCounts.total,
                    description: 'Active and inactive bots',
                    icon: <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />,
                  },
                  {
                    title: 'Active Conversations',
                    value: totalConversations.toLocaleString(),
                    description: 'Across all active bots',
                    trend: { value: 12.5, label: 'vs last week', direction: 'up' as const },
                    icon: <ArrowTopRightOnSquareIcon className="h-6 w-6 text-green-600" />,
                  },
                  {
                    title: 'Daily Cost',
                    value: `$${totalCost.toFixed(2)}`,
                    description: 'Total operational cost',
                    trend: { value: 3.2, label: 'vs yesterday', direction: 'down' as const },
                    icon: <PlusIcon className="h-6 w-6 text-purple-600" />,
                  },
                  {
                    title: 'Avg Performance',
                    value: `${avgPerformance.toFixed(1)}%`,
                    description: 'Across active chatbots',
                    trend: { value: 2.1, label: 'improvement', direction: 'up' as const },
                    icon: <Cog6ToothIcon className="h-6 w-6 text-orange-600" />,
                  },
                ]}
              />
            </EnhancedDashboardSection>

            {/* Filters and Search */}
            <EnhancedDashboardSection>
              <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4 lg:items-end">
                <div className="flex-1 space-y-2">
                  <FormLabel>Search Chatbots</FormLabel>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search by name, description, or knowledge base..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-3">
                  <div className="space-y-2">
                    <FormLabel>Status</FormLabel>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <FormLabel>Model</FormLabel>
                    <Select value={modelFilter} onValueChange={setModelFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Models</SelectItem>
                        {MODEL_OPTIONS.map((group) =>
                          group.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label} {option.isRecommended ? '⭐' : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <FormLabel>Integration</FormLabel>
                    <Select value={integrationFilter} onValueChange={setIntegrationFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="widget">Widget</SelectItem>
                        <SelectItem value="api">API</SelectItem>
                        <SelectItem value="iframe">iFrame</SelectItem>
                        <SelectItem value="line-oa">LINE OA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <FormLabel>View</FormLabel>
                    <div className="flex rounded-lg border p-1">
                      <Button
                        variant={viewMode === 'card' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('card')}
                        className="flex-1"
                      >
                        <Squares2X2Icon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="flex-1"
                      >
                        <ListBulletIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </EnhancedDashboardSection>

            {/* Chatbots List */}
            <EnhancedDashboardSection>
              {filteredChatbots.length === 0 ? (
                <div className="py-12">
                  {searchTerm || statusFilter !== 'all' || modelFilter !== 'all' || integrationFilter !== 'all' ? (
                    <FilteredResultsEmpty
                      onClearFilters={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setModelFilter('all');
                        setIntegrationFilter('all');
                      }}
                      onResetSearch={() => {
                        setSearchTerm('');
                      }}
                    />
                  ) : (
                    <NoChatbotsEmpty
                      onCreateFirst={handleCreateNew}
                      onLearnMore={() => console.log('Learn more')}
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Typography variant="small" color="muted">
                      Showing {filteredChatbots.length} of {chatbots.length} chatbots
                    </Typography>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <FunnelIcon className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                    </div>
                  </div>

                  <div className={cn(
                    viewMode === 'card'
                      ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3'
                      : 'space-y-3'
                  )}>
                    {filteredChatbots.map((chatbot) => (
                      <EnhancedChatbotCard
                        key={chatbot.id}
                        chatbot={chatbot}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onView={handleView}
                        onConfigure={handleConfigure}
                        onTest={handleTest}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
                </div>
              )}
            </EnhancedDashboardSection>
          </>
        )}
      </EnhancedDashboardPage>
    </ChatbotErrorBoundary>
  );
}