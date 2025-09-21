'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SearchResult {
  chunk_id: string;
  document_id: string;
  product_id: string;
  content: string;
  similarity_score: number;
  chunk_type: string;
  document_title: string;
  product_name: string;
  metadata: any;
}

export default function TestSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/test-rag-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }

      // Transform results to match our interface
      const transformedResults = data.data.search_results.map((result: any) => ({
        chunk_id: result.chunk_id,
        document_id: result.document_id || result.chunk_id,
        product_id: result.metadata?.source || result.filename?.replace(/\.[^/.]+$/, "") || 'unknown',
        content: result.content_preview,
        similarity_score: result.similarity_score,
        chunk_type: result.chunk_type,
        document_title: result.document_title || result.filename || `${result.chunk_type.replace('_', ' ')} Document`,
        product_name: result.document_title ?
          result.document_title.split(' ')[0] :
          (result.filename ?
            result.filename.replace(/\.[^/.]+$/, "").replace(/_/g, ' ') :
            'Unknown Product'),
        metadata: {
          ...result.metadata,
          relevance_reason: result.relevance_reason,
          document_title: result.document_title,
          filename: result.filename
        }
      }));

      setResults(transformedResults);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Vector Search Test Page</h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Search Test</CardTitle>
            <CardDescription>
              Test the Vector Search API integration with real DEPA document data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter search query (e.g., 'What is DEPA?', 'contact information', 'vision')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700">Error: {error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Search Results ({results.length})</h2>

            {results.map((result, index) => (
              <Card key={result.chunk_id} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {result.document_title}
                  </CardTitle>
                  <CardDescription>
                    Product: <span className="font-medium">{result.product_name}</span> |
                    Type: <span className="font-medium">{result.chunk_type.replace('_', ' ')}</span> |
                    Similarity: <span className="font-medium">{(result.similarity_score * 100).toFixed(1)}%</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">{result.content}</p>

                  {result.metadata.relevance_reason && (
                    <div className="bg-blue-50 p-3 rounded border-l-4 border-l-blue-400">
                      <p className="text-sm text-blue-700">
                        <strong>Relevance:</strong> {result.metadata.relevance_reason}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && results.length === 0 && !error && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">
                Enter a search query above to test the Vector Search functionality
              </p>
              <div className="mt-4 text-sm text-gray-400">
                <p>Try these example queries:</p>
                <ul className="mt-2 space-y-1">
                  <li>• "What is DEPA?"</li>
                  <li>• "contact information"</li>
                  <li>• "vision statement"</li>
                  <li>• "digital economy"</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}