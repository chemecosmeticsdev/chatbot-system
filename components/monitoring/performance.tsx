'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Activity,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Download,
  Filter,
  Calendar,
  DollarSign,
  Clock,
  Users,
  MessageSquare,
  Search,
  Bot,
  Database,
  Zap,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChatbotErrorBoundary } from '@/lib/monitoring/sentry-error-boundary';
import { SentryUtils } from '@/lib/monitoring/sentry-utils';

/**
 * Performance monitoring dashboard interfaces
 */
interface PerformanceMetrics {
  // Response time metrics
  vectorSearch: {
    averageTime: number;
    p95Time: number;
    successRate: number;
    queriesPerMinute: number;
  };

  // LLM performance
  llmUsage: {
    averageResponseTime: number;
    tokensPerMinute: number;
    costPerHour: number;
    errorRate: number;
    modelBreakdown: Array<{
      model: string;
      usage: number;
      avgCost: number;
    }>;
  };

  // Document processing
  documentProcessing: {
    processingQueue: number;
    averageProcessingTime: number;
    successRate: number;
    ocrAccuracy: number;
  };

  // Conversation quality
  conversationQuality: {
    averageSatisfaction: number;
    responseRelevance: number;
    conversationsPerHour: number;
    averageConversationLength: number;
  };

  // System health
  systemHealth: {
    apiHealth: 'healthy' | 'degraded' | 'down';
    databaseHealth: 'healthy' | 'degraded' | 'down';
    vectorDbHealth: 'healthy' | 'degraded' | 'down';
    integrationHealth: 'healthy' | 'degraded' | 'down';
  };

  // Cost analysis
  costAnalysis: {
    totalCostToday: number;
    totalCostThisMonth: number;
    costTrend: 'increasing' | 'decreasing' | 'stable';
    costBreakdown: Array<{
      service: string;
      cost: number;
      percentage: number;
    }>;
  };
}

interface AlertConfiguration {
  responseTimeThreshold: number;
  errorRateThreshold: number;
  costThreshold: number;
  enableEmailAlerts: boolean;
  enableSlackAlerts: boolean;
}

interface TimeRange {
  label: string;
  value: '1h' | '6h' | '24h' | '7d' | '30d';
  hours: number;
}

interface ChatbotFilter {
  id: string;
  name: string;
  selected: boolean;
}

const TIME_RANGES: TimeRange[] = [
  { label: 'Last Hour', value: '1h', hours: 1 },
  { label: 'Last 6 Hours', value: '6h', hours: 6 },
  { label: 'Last 24 Hours', value: '24h', hours: 24 },
  { label: 'Last 7 Days', value: '7d', hours: 168 },
  { label: 'Last 30 Days', value: '30d', hours: 720 }
];

/**
 * Performance Monitoring Dashboard Component
 *
 * Provides comprehensive real-time monitoring of chatbot system performance,
 * including response times, LLM usage, costs, and system health indicators.
 * Features responsive design with Thai/English support and accessibility compliance.
 */
export function PerformanceDashboard() {
  // State management
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>(TIME_RANGES[2]); // 24h default
  const [chatbotFilters, setChatbotFilters] = useState<ChatbotFilter[]>([]);
  const [alertConfig, setAlertConfig] = useState<AlertConfiguration>({
    responseTimeThreshold: 200,
    errorRateThreshold: 5,
    costThreshold: 100,
    enableEmailAlerts: true,
    enableSlackAlerts: false
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDetailedView, setShowDetailedView] = useState(false);

  // Refs for real-time updates
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);
  const eventSource = useRef<EventSource | null>(null);

  /**
   * Fetch performance metrics from the API
   */
  const fetchMetrics = useCallback(async () => {
    try {
      setIsRefreshing(true);

      const selectedChatbots = chatbotFilters
        .filter(f => f.selected)
        .map(f => f.id);

      const params = new URLSearchParams({
        timeRange: timeRange.value,
        ...(selectedChatbots.length > 0 && { chatbots: selectedChatbots.join(',') })
      });

      const response = await fetch(`/api/v1/monitoring/performance?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }

      const data = await response.json();
      setMetrics(data);
      setError(null);

      // Log successful metrics fetch
      SentryUtils.addBreadcrumb('Performance metrics fetched', {
        time_range: timeRange.value,
        chatbot_count: selectedChatbots.length,
        success: true
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);

      // Capture error with Sentry
      SentryUtils.captureError(new Error(`Performance dashboard error: ${errorMessage}`), {
        operation: 'fetch_performance_metrics',
        additionalData: {
          time_range: timeRange.value,
          chatbot_filters: chatbotFilters.length
        }
      });
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [timeRange, chatbotFilters]);

  /**
   * Fetch available chatbots for filtering
   */
  const fetchChatbots = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/chatbots?status=active', {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        const filters = data.chatbots.map((bot: any) => ({
          id: bot.id,
          name: bot.name,
          selected: true // All selected by default
        }));
        setChatbotFilters(filters);
      }
    } catch (err) {
      console.warn('Failed to fetch chatbots for filtering:', err);
    }
  }, []);

  /**
   * Setup real-time updates via Server-Sent Events
   */
  const setupRealTimeUpdates = useCallback(() => {
    if (!autoRefresh) return;

    try {
      eventSource.current = new EventSource('/api/v1/monitoring/performance/stream');

      eventSource.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMetrics(prevMetrics => ({
            ...prevMetrics,
            ...data
          }));
        } catch (err) {
          console.warn('Failed to parse SSE data:', err);
        }
      };

      eventSource.current.onerror = () => {
        console.warn('SSE connection error, falling back to polling');
        setupPolling();
      };

    } catch (err) {
      console.warn('SSE not supported, falling back to polling');
      setupPolling();
    }
  }, [autoRefresh]);

  /**
   * Setup polling for regular updates
   */
  const setupPolling = useCallback(() => {
    if (!autoRefresh) return;

    refreshInterval.current = setInterval(() => {
      fetchMetrics();
    }, 30000); // Refresh every 30 seconds
  }, [autoRefresh, fetchMetrics]);

  /**
   * Export performance report
   */
  const exportReport = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        timeRange: timeRange.value,
        format: 'csv',
        detailed: showDetailedView.toString()
      });

      const response = await fetch(`/api/v1/monitoring/performance/export?${params}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${timeRange.value}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        SentryUtils.addBreadcrumb('Performance report exported', {
          time_range: timeRange.value,
          format: 'csv'
        });
      }
    } catch (err) {
      SentryUtils.captureError(new Error('Failed to export performance report'), {
        operation: 'export_performance_report'
      });
    }
  }, [timeRange, showDetailedView]);

  /**
   * Toggle chatbot filter
   */
  const toggleChatbotFilter = useCallback((chatbotId: string) => {
    setChatbotFilters(prev =>
      prev.map(filter =>
        filter.id === chatbotId
          ? { ...filter, selected: !filter.selected }
          : filter
      )
    );
  }, []);

  // Effects
  useEffect(() => {
    fetchChatbots();
    fetchMetrics();
  }, [fetchChatbots, fetchMetrics]);

  useEffect(() => {
    if (autoRefresh) {
      setupRealTimeUpdates();
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
      if (eventSource.current) {
        eventSource.current.close();
      }
    };
  }, [autoRefresh, setupRealTimeUpdates]);

  /**
   * Calculate performance trends
   */
  const trends = useMemo(() => {
    if (!metrics) return null;

    return {
      responseTime: metrics.vectorSearch.averageTime < 200 ? 'improving' : 'degrading',
      errorRate: metrics.llmUsage.errorRate < 2 ? 'improving' : 'degrading',
      costs: metrics.costAnalysis.costTrend,
      satisfaction: metrics.conversationQuality.averageSatisfaction > 4 ? 'improving' : 'degrading'
    };
  }, [metrics]);

  /**
   * Get health status color
   */
  const getHealthColor = useCallback((status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }, []);

  /**
   * Get health status icon
   */
  const getHealthIcon = useCallback((status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'down': return <XCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  }, []);

  /**
   * Get trend icon
   */
  const getTrendIcon = useCallback((trend: string) => {
    switch (trend) {
      case 'improving':
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'degrading':
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading performance data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Error loading performance data</span>
          </div>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <Button
            onClick={fetchMetrics}
            className="mt-4"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No performance data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ChatbotErrorBoundary
      tags={{ component: 'performance_dashboard' }}
      context={{ time_range: timeRange.value, auto_refresh: autoRefresh }}
    >
      <div className="space-y-6">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Performance Monitor</h1>
            <p className="text-muted-foreground">
              Real-time system performance and health monitoring
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Time Range Selector */}
            <select
              value={timeRange.value}
              onChange={(e) => {
                const range = TIME_RANGES.find(r => r.value === e.target.value);
                if (range) setTimeRange(range);
              }}
              className="px-3 py-2 border border-border rounded-md bg-background text-sm"
              aria-label="Select time range"
            >
              {TIME_RANGES.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>

            {/* Auto-refresh Toggle */}
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              aria-label={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
            >
              {autoRefresh ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>

            {/* Manual Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMetrics}
              disabled={isRefreshing}
              aria-label="Refresh data"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>

            {/* Export Report */}
            <Button
              variant="outline"
              size="sm"
              onClick={exportReport}
              aria-label="Export performance report"
            >
              <Download className="h-4 w-4" />
            </Button>

            {/* View Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetailedView(!showDetailedView)}
              aria-label={showDetailedView ? "Show summary view" : "Show detailed view"}
            >
              {showDetailedView ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(metrics.systemHealth).map(([service, status]) => (
            <Card key={service} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={getHealthColor(status)}>
                    {getHealthIcon(status)}
                  </div>
                  <span className="font-medium capitalize">
                    {service.replace('Health', '')}
                  </span>
                </div>
                <span className={cn("text-sm font-medium capitalize", getHealthColor(status))}>
                  {status}
                </span>
              </div>
            </Card>
          ))}
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Vector Search Performance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                <Search className="h-4 w-4 mr-2" />
                Vector Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {metrics.vectorSearch.averageTime.toFixed(0)}ms
                  </span>
                  {trends && getTrendIcon(trends.responseTime)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Avg Response Time
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="font-medium">Success Rate</div>
                    <div className="text-green-600">
                      {metrics.vectorSearch.successRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Queries/min</div>
                    <div>{metrics.vectorSearch.queriesPerMinute.toFixed(0)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LLM Usage */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                <Bot className="h-4 w-4 mr-2" />
                LLM Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {metrics.llmUsage.averageResponseTime.toFixed(0)}ms
                  </span>
                  {trends && getTrendIcon(trends.responseTime)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Avg Response Time
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="font-medium">Tokens/min</div>
                    <div>{metrics.llmUsage.tokensPerMinute.toFixed(0)}</div>
                  </div>
                  <div>
                    <div className="font-medium">Error Rate</div>
                    <div className={cn(
                      metrics.llmUsage.errorRate > 5 ? "text-red-600" : "text-green-600"
                    )}>
                      {metrics.llmUsage.errorRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversation Quality */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {metrics.conversationQuality.averageSatisfaction.toFixed(1)}
                  </span>
                  {trends && getTrendIcon(trends.satisfaction)}
                </div>
                <div className="text-sm text-muted-foreground">
                  User Satisfaction (1-5)
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="font-medium">Relevance</div>
                    <div>{metrics.conversationQuality.responseRelevance.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="font-medium">Conv/hour</div>
                    <div>{metrics.conversationQuality.conversationsPerHour.toFixed(0)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Analysis */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Costs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    ${metrics.costAnalysis.totalCostToday.toFixed(2)}
                  </span>
                  {trends && getTrendIcon(trends.costs)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Today's Cost
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="font-medium">This Month</div>
                    <div>${metrics.costAnalysis.totalCostThisMonth.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="font-medium">Trend</div>
                    <div className={cn(
                      metrics.costAnalysis.costTrend === 'increasing' ? "text-red-600" :
                      metrics.costAnalysis.costTrend === 'decreasing' ? "text-green-600" :
                      "text-gray-600"
                    )}>
                      {metrics.costAnalysis.costTrend}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed View */}
        {showDetailedView && (
          <>
            {/* Chatbot Filters */}
            {chatbotFilters.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Filter className="h-5 w-5 mr-2" />
                    Chatbot Filters
                  </CardTitle>
                  <CardDescription>
                    Select chatbots to include in performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {chatbotFilters.map(filter => (
                      <Button
                        key={filter.id}
                        variant={filter.selected ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleChatbotFilter(filter.id)}
                        className="text-xs"
                      >
                        {filter.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* LLM Model Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">LLM Model Usage</CardTitle>
                  <CardDescription>
                    Breakdown by model type and cost
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.llmUsage.modelBreakdown.map((model, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{model.model}</div>
                          <div className="text-sm text-muted-foreground">
                            {model.usage.toFixed(0)} requests
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${model.avgCost.toFixed(3)}</div>
                          <div className="text-sm text-muted-foreground">avg cost</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Cost Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cost Breakdown</CardTitle>
                  <CardDescription>
                    Service-wise cost distribution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.costAnalysis.costBreakdown.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium capitalize">{item.service}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.percentage.toFixed(1)}% of total
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${item.cost.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Document Processing Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Document Processing
                </CardTitle>
                <CardDescription>
                  Current processing status and performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-orange-600">
                      {metrics.documentProcessing.processingQueue}
                    </div>
                    <div className="text-sm text-muted-foreground">Queue Size</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold">
                      {metrics.documentProcessing.averageProcessingTime.toFixed(0)}s
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Processing Time</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {metrics.documentProcessing.successRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {metrics.documentProcessing.ocrAccuracy.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">OCR Accuracy</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alert Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Alert Configuration
                </CardTitle>
                <CardDescription>
                  Configure performance thresholds and notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Response Time Threshold (ms)
                    </label>
                    <input
                      type="number"
                      value={alertConfig.responseTimeThreshold}
                      onChange={(e) => setAlertConfig(prev => ({
                        ...prev,
                        responseTimeThreshold: parseInt(e.target.value) || 200
                      }))}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background"
                      min="50"
                      max="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Error Rate Threshold (%)
                    </label>
                    <input
                      type="number"
                      value={alertConfig.errorRateThreshold}
                      onChange={(e) => setAlertConfig(prev => ({
                        ...prev,
                        errorRateThreshold: parseFloat(e.target.value) || 5
                      }))}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Daily Cost Threshold ($)
                    </label>
                    <input
                      type="number"
                      value={alertConfig.costThreshold}
                      onChange={(e) => setAlertConfig(prev => ({
                        ...prev,
                        costThreshold: parseFloat(e.target.value) || 100
                      }))}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background"
                      min="1"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={alertConfig.enableEmailAlerts}
                      onChange={(e) => setAlertConfig(prev => ({
                        ...prev,
                        enableEmailAlerts: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <span className="text-sm">Email Alerts</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={alertConfig.enableSlackAlerts}
                      onChange={(e) => setAlertConfig(prev => ({
                        ...prev,
                        enableSlackAlerts: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <span className="text-sm">Slack Alerts</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Performance Alerts */}
        {metrics.vectorSearch.averageTime > alertConfig.responseTimeThreshold && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Performance Alert</span>
              </div>
              <p className="mt-1 text-sm text-yellow-700">
                Vector search response time ({metrics.vectorSearch.averageTime.toFixed(0)}ms)
                exceeds threshold ({alertConfig.responseTimeThreshold}ms)
              </p>
            </CardContent>
          </Card>
        )}

        {metrics.llmUsage.errorRate > alertConfig.errorRateThreshold && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Error Rate Alert</span>
              </div>
              <p className="mt-1 text-sm text-red-700">
                LLM error rate ({metrics.llmUsage.errorRate.toFixed(1)}%)
                exceeds threshold ({alertConfig.errorRateThreshold}%)
              </p>
            </CardContent>
          </Card>
        )}

        {metrics.costAnalysis.totalCostToday > alertConfig.costThreshold && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-orange-800">
                <DollarSign className="h-5 w-5" />
                <span className="font-medium">Cost Alert</span>
              </div>
              <p className="mt-1 text-sm text-orange-700">
                Daily cost (${metrics.costAnalysis.totalCostToday.toFixed(2)})
                exceeds threshold (${alertConfig.costThreshold.toFixed(2)})
              </p>
            </CardContent>
          </Card>
        )}

        {/* Last Updated */}
        <div className="text-center text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleString()}
          {autoRefresh && " • Auto-refresh enabled"}
        </div>
      </div>
    </ChatbotErrorBoundary>
  );
}

export default PerformanceDashboard;