'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@stackframe/stack';
import { useDebounce } from '@/hooks/use-debounce';
import { VectorSearchResult } from '@/lib/vector/search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Filter,
  Download,
  Clock,
  Database,
  FileText,
  Zap,
  TrendingUp,
  Star,
  History,
  Settings,
  Info,
  AlertCircle,
  CheckCircle,
  Loader2,
  BarChart3,
  Target,
  Layers
} from 'lucide-react';

// Types for search functionality
interface SearchFilters {
  productIds: string[];
  documentTypes: string[];
  similarityThreshold: number;
  maxResults: number;
}

// VectorSearchResult imported from @/lib/vector/search

interface FullTextSearchResult {
  document_id: string;
  title: string;
  content_snippet: string;
  rank: number;
  product_name?: string;
}

interface SearchResponse {
  success: boolean;
  data: {
    query: string;
    results: VectorSearchResult[] | FullTextSearchResult[];
    total_results: number;
    processing_time_ms: number;
  };
  error?: string;
}

interface SearchPerformanceMetrics {
  totalSearches: number;
  averageResponseTime: number;
  successRate: number;
  popularQueries: Array<{ query: string; count: number }>;
}

const SEARCH_MODES = {
  VECTOR: 'vector',
  FULLTEXT: 'fulltext',
  HYBRID: 'hybrid'
} as const;

type SearchMode = typeof SEARCH_MODES[keyof typeof SEARCH_MODES];

export default function VectorSearchPage() {
  const user = useUser({ or: 'redirect' });

  // Search state
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>(SEARCH_MODES.VECTOR);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<VectorSearchResult[] | FullTextSearchResult[]>([]);
  const [searchMetadata, setSearchMetadata] = useState<{
    totalResults: number;
    processingTime: number;
    query: string;
  }>({ totalResults: 0, processingTime: 0, query: '' });

  // Filter state
  const [filters, setFilters] = useState<SearchFilters>({
    productIds: [],
    documentTypes: [],
    similarityThreshold: 0.7,
    maxResults: 20
  });

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<SearchPerformanceMetrics>({
    totalSearches: 0,
    averageResponseTime: 0,
    successRate: 100,
    popularQueries: []
  });

  // Error and loading states
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Debounced query for auto-search
  const debouncedQuery = useDebounce(query, 500);

  // Mock data for demonstration (in real implementation, fetch from API)
  const availableProducts = [
    { id: 'prod-1', name: 'Smart Home Hub Pro' },
    { id: 'prod-2', name: 'Wireless Security Camera' },
    { id: 'prod-3', name: 'Smart Doorbell' },
    { id: 'prod-4', name: 'Legacy Control Panel' }
  ];

  const availableDocumentTypes = [
    'technical',
    'user_manual',
    'regulatory',
    'safety_guide',
    'installation',
    'troubleshooting',
    'specifications'
  ];

  // Search function
  const performSearch = useCallback(async (searchQuery: string, mode: SearchMode) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearchMetadata({ totalResults: 0, processingTime: 0, query: '' });
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const startTime = performance.now();

      // Call the working RAG search API
      const response = await fetch('/api/test-rag-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery
        })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }

      // Transform RAG API results to our UI format
      const apiResults = data.data.search_results.map((result: any) => ({
        chunk_id: result.chunk_id,
        document_id: result.document_id || result.chunk_id,
        product_id: result.metadata?.source || result.filename?.replace(/\.[^/.]+$/, "") || 'unknown',
        content: result.content_preview,
        similarity_score: result.similarity_score,
        chunk_type: result.chunk_type,
        document_title: result.document_title || result.filename || `${result.chunk_type.replace('_', ' ')} Document`,
        product_name: result.document_title ?
          result.document_title.split(' ')[0] : // Use first word of document title
          (result.filename ?
            result.filename.replace(/\.[^/.]+$/, "").replace(/_/g, ' ') : // Remove extension and format filename
            (result.metadata?.source ?
              result.metadata.source.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2') :
              'Unknown Product')),
        metadata: {
          ...result.metadata,
          relevance_reason: result.relevance_reason,
          chunk_type: result.chunk_type,
          search_method: data.data.knowledge_base_stats.search_method,
          document_title: result.document_title,
          filename: result.filename
        }
      }));
      const processingTime = performance.now() - startTime;

      setResults(apiResults);
      setSearchMetadata({
        totalResults: apiResults.length,
        processingTime,
        query: searchQuery
      });

      // Update search history
      setSearchHistory(prev => {
        const newHistory = [searchQuery, ...prev.filter(q => q !== searchQuery)].slice(0, 10);
        return newHistory;
      });

      // Update performance metrics
      setPerformanceMetrics(prev => ({
        totalSearches: prev.totalSearches + 1,
        averageResponseTime: (prev.averageResponseTime * prev.totalSearches + processingTime) / (prev.totalSearches + 1),
        successRate: 100, // Mock - in real implementation, track failures
        popularQueries: updatePopularQueries(prev.popularQueries, searchQuery)
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [filters]);

  // Auto-search when debounced query changes
  useEffect(() => {
    if (debouncedQuery && !isInitialLoad) {
      performSearch(debouncedQuery, searchMode);
    }
    if (isInitialLoad && debouncedQuery) {
      setIsInitialLoad(false);
    }
  }, [debouncedQuery, searchMode, performSearch, isInitialLoad]);

  // Mock result generator
  const generateMockResults = (searchQuery: string, mode: SearchMode, filters: SearchFilters): VectorSearchResult[] | FullTextSearchResult[] => {
    const isVector = mode === SEARCH_MODES.VECTOR || mode === SEARCH_MODES.HYBRID;
    const baseCount = Math.floor(Math.random() * 10) + 5;

    if (isVector) {
      return Array.from({ length: baseCount }, (_, i) => ({
        chunk_id: `chunk-${i + 1}`,
        document_id: `doc-${i + 1}`,
        product_id: availableProducts[i % availableProducts.length].id,
        content: `This document section contains information about ${searchQuery}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Detailed technical specifications and user guidelines are provided here. This content is relevant to your search query and provides comprehensive information about the topic.`,
        similarity_score: Math.max(filters.similarityThreshold, Math.random() * (1 - filters.similarityThreshold) + filters.similarityThreshold),
        chunk_type: availableDocumentTypes[i % availableDocumentTypes.length],
        document_title: `${availableDocumentTypes[i % availableDocumentTypes.length].replace('_', ' ')} Document ${i + 1}`,
        product_name: availableProducts[i % availableProducts.length].name,
        metadata: {
          page_number: i + 1,
          section: `Section ${i + 1}`,
          created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }));
    } else {
      return Array.from({ length: baseCount }, (_, i) => ({
        document_id: `doc-${i + 1}`,
        title: `Document about ${searchQuery} - ${i + 1}`,
        content_snippet: `This document discusses ${searchQuery} in detail. It provides comprehensive information and guidelines for users and administrators...`,
        rank: i + 1,
        product_name: availableProducts[i % availableProducts.length].name
      }));
    }
  };

  // Update popular queries
  const updatePopularQueries = (current: Array<{ query: string; count: number }>, newQuery: string) => {
    const existing = current.find(q => q.query === newQuery);
    if (existing) {
      existing.count++;
      return [...current].sort((a, b) => b.count - a.count);
    } else {
      return [...current, { query: newQuery, count: 1 }].sort((a, b) => b.count - a.count).slice(0, 5);
    }
  };

  // Export results function
  const exportResults = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `search_results_${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const isVectorMode = searchMode === SEARCH_MODES.VECTOR || searchMode === SEARCH_MODES.HYBRID;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Page Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Vector Search</h2>
          <p className="text-muted-foreground">
            Advanced semantic search across your knowledge base using vector embeddings and full-text search.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportResults} disabled={results.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export Results
          </Button>
        </div>
      </div>

      <Separator />

      {/* Search Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Search Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search Controls */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Search Query</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant={isSearching ? "default" : "secondary"} className="flex items-center gap-1">
                    {isSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                    {searchMode.charAt(0).toUpperCase() + searchMode.slice(1)} Search
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter your search query (e.g., 'product specifications', 'installation guide')..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 pr-4 h-12 text-lg"
                />
                {isSearching && (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </div>

              {/* Search Mode Tabs */}
              <Tabs value={searchMode} onValueChange={(value) => setSearchMode(value as SearchMode)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="vector" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Vector
                  </TabsTrigger>
                  <TabsTrigger value="fulltext" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Full-Text
                  </TabsTrigger>
                  <TabsTrigger value="hybrid" className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Hybrid
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Quick Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-2">
                  <Sheet open={showFilters} onOpenChange={setShowFilters}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" />
                        Advanced Filters
                        {(filters.productIds.length > 0 || filters.documentTypes.length > 0) && (
                          <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                            {filters.productIds.length + filters.documentTypes.length}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                  </Sheet>

                  {query && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => performSearch(query, searchMode)}
                      disabled={isSearching}
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Search Now
                    </Button>
                  )}
                </div>

                {searchMetadata.processingTime > 0 && (
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {searchMetadata.processingTime.toFixed(0)}ms
                    </div>
                    <div className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      {searchMetadata.totalResults} results
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Search Results */}
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isSearching && (
              <div className="space-y-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2 mb-4" />
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isSearching && results.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Search Results ({searchMetadata.totalResults})
                  </h3>
                  {isVectorMode && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Min Similarity: {(filters.similarityThreshold * 100).toFixed(0)}%
                    </Badge>
                  )}
                </div>

                {results.map((result, index) => (
                  <Card key={isVectorMode ? (result as VectorSearchResult).chunk_id : (result as FullTextSearchResult).document_id + index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        {/* Result Header */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <h4 className="font-semibold text-lg">
                              {isVectorMode
                                ? (result as VectorSearchResult).document_title
                                : (result as FullTextSearchResult).title
                              }
                            </h4>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Badge variant="secondary">
                                {isVectorMode
                                  ? (result as VectorSearchResult).product_name
                                  : (result as FullTextSearchResult).product_name || 'Unknown Product'
                                }
                              </Badge>
                              {isVectorMode && (
                                <Badge variant="outline">
                                  {(result as VectorSearchResult).chunk_type.replace('_', ' ')}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {isVectorMode && (
                            <div className="flex items-center space-x-2 ml-4">
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {((result as VectorSearchResult).similarity_score * 100).toFixed(1)}%
                                </div>
                                <div className="text-xs text-muted-foreground">similarity</div>
                              </div>
                              <Progress
                                value={(result as VectorSearchResult).similarity_score * 100}
                                className="w-16"
                              />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="text-sm text-gray-700 leading-relaxed">
                          {isVectorMode
                            ? (() => {
                                const vectorResult = result as VectorSearchResult;
                                return vectorResult.content.slice(0, 300) + (vectorResult.content.length > 300 ? '...' : '');
                              })()
                            : (result as FullTextSearchResult).content_snippet
                          }
                        </div>

                        {/* Metadata */}
                        {isVectorMode && (result as VectorSearchResult).metadata && (
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground pt-2 border-t">
                            <span>Document ID: {(result as VectorSearchResult).document_id}</span>
                            <span>Chunk: {(result as VectorSearchResult).chunk_index}</span>
                            {(result as VectorSearchResult).metadata?.page_number && (
                              <span>Page: {(result as VectorSearchResult).metadata.page_number}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isSearching && !error && results.length === 0 && query && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search query or reducing the similarity threshold.
                  </p>
                  <Button variant="outline" onClick={() => setShowFilters(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Adjust Filters
                  </Button>
                </CardContent>
              </Card>
            )}

            {!query && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Start searching</h3>
                  <p className="text-muted-foreground">
                    Enter a search query above to find relevant documents using advanced vector similarity or full-text search.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar - Performance & History */}
        <div className="space-y-6">
          {/* Performance Metrics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Response</span>
                  <span className="text-sm font-medium">
                    {performanceMetrics.averageResponseTime.toFixed(0)}ms
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Searches</span>
                  <span className="text-sm font-medium">{performanceMetrics.totalSearches}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                  <span className="text-sm font-medium text-green-600">
                    {performanceMetrics.successRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              {searchMetadata.processingTime > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Search</span>
                    <Badge variant={searchMetadata.processingTime < 200 ? "default" : "secondary"}>
                      {searchMetadata.processingTime.toFixed(0)}ms
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Recent Searches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {searchHistory.length > 0 ? (
                searchHistory.slice(0, 5).map((historyQuery, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto p-2"
                    onClick={() => setQuery(historyQuery)}
                  >
                    <span className="truncate text-sm">{historyQuery}</span>
                  </Button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent searches</p>
              )}
            </CardContent>
          </Card>

          {/* Popular Queries */}
          {performanceMetrics.popularQueries.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Popular Queries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {performanceMetrics.popularQueries.map((popular, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 justify-start text-left h-auto p-2"
                      onClick={() => setQuery(popular.query)}
                    >
                      <span className="truncate text-sm">{popular.query}</span>
                    </Button>
                    <Badge variant="secondary" className="text-xs">
                      {popular.count}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Search Tips */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Search Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="space-y-1">
                <p>• Use specific terms for better results</p>
                <p>• Vector search finds semantic similarity</p>
                <p>• Full-text search matches exact terms</p>
                <p>• Lower similarity threshold = more results</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Advanced Filters Sheet */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Advanced Search Filters</SheetTitle>
            <SheetDescription>
              Refine your search results with advanced filtering options.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Product Filter */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Products</Label>
              <div className="space-y-2">
                {availableProducts.map((product) => (
                  <div key={product.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={product.id}
                      checked={filters.productIds.includes(product.id)}
                      onChange={(e) => {
                        setFilters(prev => ({
                          ...prev,
                          productIds: e.target.checked
                            ? [...prev.productIds, product.id]
                            : prev.productIds.filter(id => id !== product.id)
                        }));
                      }}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={product.id} className="text-sm font-normal">
                      {product.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Document Types Filter */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Document Types</Label>
              <div className="space-y-2">
                {availableDocumentTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={type}
                      checked={filters.documentTypes.includes(type)}
                      onChange={(e) => {
                        setFilters(prev => ({
                          ...prev,
                          documentTypes: e.target.checked
                            ? [...prev.documentTypes, type]
                            : prev.documentTypes.filter(t => t !== type)
                        }));
                      }}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={type} className="text-sm font-normal capitalize">
                      {type.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {isVectorMode && (
              <>
                <Separator />

                {/* Similarity Threshold */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Similarity Threshold</Label>
                    <Badge variant="secondary">
                      {(filters.similarityThreshold * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <Slider
                    value={[filters.similarityThreshold]}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, similarityThreshold: value[0] }))}
                    max={1}
                    min={0.1}
                    step={0.05}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10% (More results)</span>
                    <span>100% (Exact matches)</span>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Max Results */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Maximum Results</Label>
              <Select
                value={filters.maxResults.toString()}
                onValueChange={(value) => setFilters(prev => ({ ...prev, maxResults: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 results</SelectItem>
                  <SelectItem value="20">20 results</SelectItem>
                  <SelectItem value="50">50 results</SelectItem>
                  <SelectItem value="100">100 results</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({
                    productIds: [],
                    documentTypes: [],
                    similarityThreshold: 0.7,
                    maxResults: 20
                  });
                }}
                className="flex-1"
              >
                Reset Filters
              </Button>
              <Button onClick={() => setShowFilters(false)} className="flex-1">
                Apply Filters
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}