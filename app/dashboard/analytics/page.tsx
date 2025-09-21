'use client';

import React, { useState, useEffect } from 'react';
import { DashboardPage, DashboardSection } from '@/components/ui/dashboard/layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { ChatbotErrorBoundary } from '@/lib/monitoring/sentry-error-boundary';

interface AnalyticsMetric {
  label: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<any>;
  color: string;
}

interface ConversationMetrics {
  total_conversations: number;
  successful_conversations: number;
  abandoned_conversations: number;
  avg_conversation_length: number;
  avg_response_time: number;
  user_satisfaction: number;
}

interface UsageMetrics {
  daily_active_users: number;
  total_messages: number;
  avg_messages_per_conversation: number;
  peak_usage_hour: string;
  top_queries: string[];
}

interface CostMetrics {
  total_cost_24h: number;
  total_cost_7d: number;
  total_cost_30d: number;
  cost_per_conversation: number;
  tokens_used_24h: number;
  projected_monthly_cost: number;
}

interface ChatbotPerformance {
  chatbot_id: string;
  chatbot_name: string;
  conversations: number;
  success_rate: number;
  avg_response_time: number;
  user_rating: number;
  cost_24h: number;
  status: 'active' | 'inactive';
}

interface TimeSeriesData {
  timestamp: string;
  conversations: number;
  messages: number;
  users: number;
  cost: number;
}

function MetricCard({ metric }: { metric: AnalyticsMetric }) {
  const Icon = metric.icon;
  const isPositive = metric.changeType === 'increase';
  const isNegative = metric.changeType === 'decrease';

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{metric.label}</p>
          <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
          <div className="flex items-center mt-2">
            {metric.changeType !== 'neutral' && (
              <>
                {isPositive ? (
                  <ArrowUpIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={`text-sm ml-1 ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {Math.abs(metric.change)}%
                </span>
                <span className="text-sm text-gray-500 ml-1">vs last period</span>
              </>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-full ${metric.color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </Card>
  );
}

interface SimpleChartProps {
  data: TimeSeriesData[];
  dataKey: keyof TimeSeriesData;
  title: string;
  color: string;
}

function SimpleChart({ data, dataKey, title, color }: SimpleChartProps) {
  const maxValue = Math.max(...data.map(d => Number(d[dataKey])));
  const chartHeight = 100;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="relative">
        <svg width="100%" height={chartHeight} className="overflow-visible">
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Chart area */}
          <path
            d={`M 0 ${chartHeight} ${data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = chartHeight - (Number(d[dataKey]) / maxValue) * chartHeight;
              return `${i === 0 ? 'M' : 'L'} ${x}% ${y}`;
            }).join(' ')} L 100% ${chartHeight} Z`}
            fill={`url(#gradient-${dataKey})`}
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Data points */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = chartHeight - (Number(d[dataKey]) / maxValue) * chartHeight;
            return (
              <circle
                key={i}
                cx={`${x}%`}
                cy={y}
                r="3"
                fill={color}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        {data.filter((_, i) => i % Math.ceil(data.length / 4) === 0).map((d, i) => (
          <span key={i}>{new Date(d.timestamp).toLocaleDateString()}</span>
        ))}
      </div>
    </Card>
  );
}

function ChatbotPerformanceTable({ chatbots }: { chatbots: ChatbotPerformance[] }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Chatbot Performance</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Chatbot
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conversations
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Success Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Response
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User Rating
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost (24h)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {chatbots.map((chatbot) => (
              <tr key={chatbot.chatbot_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {chatbot.chatbot_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {chatbot.conversations.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${chatbot.success_rate}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-900">{chatbot.success_rate}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {chatbot.avg_response_time}ms
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900 mr-1">{chatbot.user_rating.toFixed(1)}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-xs ${
                            star <= chatbot.user_rating ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${chatbot.cost_24h.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      chatbot.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {chatbot.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/**
 * Analytics Dashboard Page
 *
 * Provides comprehensive analytics and monitoring for chatbot performance including:
 * - Key performance metrics with trend indicators
 * - Conversation and usage analytics
 * - Cost tracking and optimization insights
 * - Individual chatbot performance comparison
 * - Time-series data visualization
 * - User satisfaction and engagement metrics
 */
export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedChatbot, setSelectedChatbot] = useState('all');

  const [conversationMetrics, setConversationMetrics] = useState<ConversationMetrics>({
    total_conversations: 0,
    successful_conversations: 0,
    abandoned_conversations: 0,
    avg_conversation_length: 0,
    avg_response_time: 0,
    user_satisfaction: 0,
  });

  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics>({
    daily_active_users: 0,
    total_messages: 0,
    avg_messages_per_conversation: 0,
    peak_usage_hour: '',
    top_queries: [],
  });

  const [costMetrics, setCostMetrics] = useState<CostMetrics>({
    total_cost_24h: 0,
    total_cost_7d: 0,
    total_cost_30d: 0,
    cost_per_conversation: 0,
    tokens_used_24h: 0,
    projected_monthly_cost: 0,
  });

  const [chatbotPerformance, setChatbotPerformance] = useState<ChatbotPerformance[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);

  useEffect(() => {
    // Mock data for demonstration
    setTimeout(() => {
      setConversationMetrics({
        total_conversations: 1847,
        successful_conversations: 1654,
        abandoned_conversations: 193,
        avg_conversation_length: 4.2,
        avg_response_time: 1250,
        user_satisfaction: 4.3,
      });

      setUsageMetrics({
        daily_active_users: 342,
        total_messages: 7789,
        avg_messages_per_conversation: 4.2,
        peak_usage_hour: '14:00',
        top_queries: [
          'How to reset password',
          'Business hours',
          'Contact support',
          'Return policy',
          'Account settings',
        ],
      });

      setCostMetrics({
        total_cost_24h: 23.45,
        total_cost_7d: 164.12,
        total_cost_30d: 702.34,
        cost_per_conversation: 0.38,
        tokens_used_24h: 45670,
        projected_monthly_cost: 850.25,
      });

      setChatbotPerformance([
        {
          chatbot_id: '1',
          chatbot_name: 'Customer Support Assistant',
          conversations: 1247,
          success_rate: 94,
          avg_response_time: 1180,
          user_rating: 4.5,
          cost_24h: 12.45,
          status: 'active',
        },
        {
          chatbot_id: '2',
          chatbot_name: 'Technical Documentation Bot',
          conversations: 678,
          success_rate: 88,
          avg_response_time: 1420,
          user_rating: 4.2,
          cost_24h: 8.67,
          status: 'active',
        },
        {
          chatbot_id: '3',
          chatbot_name: 'Sales Assistant (LINE)',
          conversations: 156,
          success_rate: 76,
          avg_response_time: 950,
          user_rating: 3.8,
          cost_24h: 2.33,
          status: 'active',
        },
        {
          chatbot_id: '4',
          chatbot_name: 'Internal Help Desk',
          conversations: 23,
          success_rate: 67,
          avg_response_time: 2100,
          user_rating: 3.2,
          cost_24h: 0.45,
          status: 'inactive',
        },
      ]);

      // Generate mock time series data
      const days = 7;
      const mockTimeSeriesData: TimeSeriesData[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        mockTimeSeriesData.push({
          timestamp: date.toISOString(),
          conversations: Math.floor(Math.random() * 100) + 150,
          messages: Math.floor(Math.random() * 500) + 800,
          users: Math.floor(Math.random() * 50) + 200,
          cost: Math.random() * 10 + 15,
        });
      }
      setTimeSeriesData(mockTimeSeriesData);

      setLoading(false);
    }, 1000);
  }, [timeRange, selectedChatbot]);

  const keyMetrics: AnalyticsMetric[] = [
    {
      label: 'Total Conversations',
      value: conversationMetrics.total_conversations.toLocaleString(),
      change: 12.5,
      changeType: 'increase',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500',
    },
    {
      label: 'Success Rate',
      value: `${Math.round((conversationMetrics.successful_conversations / conversationMetrics.total_conversations) * 100)}%`,
      change: 3.2,
      changeType: 'increase',
      icon: ChartBarIcon,
      color: 'bg-green-500',
    },
    {
      label: 'Avg Response Time',
      value: `${conversationMetrics.avg_response_time}ms`,
      change: -8.1,
      changeType: 'decrease',
      icon: ClockIcon,
      color: 'bg-yellow-500',
    },
    {
      label: 'Daily Active Users',
      value: usageMetrics.daily_active_users.toLocaleString(),
      change: 15.3,
      changeType: 'increase',
      icon: UserGroupIcon,
      color: 'bg-purple-500',
    },
    {
      label: 'Cost (24h)',
      value: `$${costMetrics.total_cost_24h.toFixed(2)}`,
      change: 5.7,
      changeType: 'increase',
      icon: CurrencyDollarIcon,
      color: 'bg-red-500',
    },
    {
      label: 'User Satisfaction',
      value: `${conversationMetrics.user_satisfaction.toFixed(1)}/5`,
      change: 0,
      changeType: 'neutral',
      icon: ChartBarIcon,
      color: 'bg-indigo-500',
    },
  ];

  return (
    <ChatbotErrorBoundary
      tags={{ page: 'analytics' }}
      context={{ time_range: timeRange, selected_chatbot: selectedChatbot }}
    >
      <DashboardPage
        title="Analytics"
        description="Monitor chatbot performance and usage metrics"
      >
        {/* Filters */}
        <DashboardSection>
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 sm:items-center">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={selectedChatbot}
                onChange={(e) => setSelectedChatbot(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Chatbots</option>
                {chatbotPerformance.map((chatbot) => (
                  <option key={chatbot.chatbot_id} value={chatbot.chatbot_id}>
                    {chatbot.chatbot_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </DashboardSection>

        {/* Key Metrics */}
        <DashboardSection>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {keyMetrics.map((metric, index) => (
                <MetricCard key={index} metric={metric} />
              ))}
            </div>
          )}
        </DashboardSection>

        {/* Charts */}
        {!loading && (
          <>
            <DashboardSection>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SimpleChart
                  data={timeSeriesData}
                  dataKey="conversations"
                  title="Conversations Over Time"
                  color="#3B82F6"
                />
                <SimpleChart
                  data={timeSeriesData}
                  dataKey="users"
                  title="Active Users"
                  color="#10B981"
                />
              </div>
            </DashboardSection>

            <DashboardSection>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SimpleChart
                  data={timeSeriesData}
                  dataKey="messages"
                  title="Messages Volume"
                  color="#8B5CF6"
                />
                <SimpleChart
                  data={timeSeriesData}
                  dataKey="cost"
                  title="Daily Costs"
                  color="#EF4444"
                />
              </div>
            </DashboardSection>

            {/* Chatbot Performance Table */}
            <DashboardSection>
              <ChatbotPerformanceTable chatbots={chatbotPerformance} />
            </DashboardSection>

            {/* Additional Insights */}
            <DashboardSection>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Top Queries</h3>
                  <div className="space-y-3">
                    {usageMetrics.top_queries.map((query, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{query}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${Math.random() * 60 + 40}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-8">
                            {Math.floor(Math.random() * 100 + 50)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Breakdown</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">24h Cost</span>
                      <span className="font-medium">${costMetrics.total_cost_24h.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">7d Cost</span>
                      <span className="font-medium">${costMetrics.total_cost_7d.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">30d Cost</span>
                      <span className="font-medium">${costMetrics.total_cost_30d.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">Projected Monthly</span>
                        <span className="font-bold text-lg">${costMetrics.projected_monthly_cost.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Tokens used (24h): {costMetrics.tokens_used_24h.toLocaleString()}
                    </div>
                  </div>
                </Card>
              </div>
            </DashboardSection>
          </>
        )}
      </DashboardPage>
    </ChatbotErrorBoundary>
  );
}