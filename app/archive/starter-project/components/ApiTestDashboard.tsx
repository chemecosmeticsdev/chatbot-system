'use client';

import { useState, useEffect } from 'react';

interface TestResult {
  success: boolean;
  service: string;
  message: string;
  data?: any;
  timestamp: string;
}

interface TestSummary {
  success: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  results: TestResult[];
  timestamp: string;
  reportGenerated: boolean;
}

export default function ApiTestDashboard() {
  const [testResults, setTestResults] = useState<TestSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [individualTests, setIndividualTests] = useState<Record<string, TestResult | null>>({
    neon: null,
    auth: null,
    bedrock: null,
    s3: null,
    mistral: null,
    llamaindex: null
  });

  const runAllTests = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-all', {
        cache: 'no-store'
      });
      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      console.error('Failed to run tests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runIndividualTest = async (service: string) => {
    setIndividualTests(prev => ({ ...prev, [service]: null }));

    try {
      const response = await fetch(`/api/test-${service}`, {
        cache: 'no-store'
      });
      const data = await response.json();
      setIndividualTests(prev => ({ ...prev, [service]: data }));
    } catch (error) {
      setIndividualTests(prev => ({
        ...prev,
        [service]: {
          success: false,
          service,
          message: `Failed to test: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        }
      }));
    }
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (success: boolean) => {
    return success ? '✅' : '❌';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">API Integration Test Dashboard</h1>
        <p className="text-gray-600 mb-8">
          Validate all service connections before development
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <button
            onClick={runAllTests}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            {isLoading ? 'Running Tests...' : 'Run All Tests'}
          </button>

          <div className="flex gap-2">
            <a
              href="/demo"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Demo Page
            </a>
            <a
              href="/admin"
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Admin Panel
            </a>
          </div>
        </div>
      </div>

      {/* Overall Test Results */}
      {testResults && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Overall Test Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600">Total Services</div>
              <div className="text-2xl font-bold">{testResults.summary.total}</div>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <div className="text-sm text-green-600">Passed</div>
              <div className="text-2xl font-bold text-green-600">{testResults.summary.passed}</div>
            </div>
            <div className="bg-red-50 p-4 rounded">
              <div className="text-sm text-red-600">Failed</div>
              <div className="text-2xl font-bold text-red-600">{testResults.summary.failed}</div>
            </div>
          </div>

          <div className="space-y-3">
            {testResults.results.map((result, index) => (
              <div key={index} className="border rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getStatusIcon(result.success)}</span>
                    <span className="font-semibold uppercase">{result.service}</span>
                  </div>
                  <span className="text-sm text-gray-500">{result.timestamp}</span>
                </div>
                <div className={`text-sm ${getStatusColor(result.success)}`}>
                  {result.message}
                </div>
                {result.data && (
                  <details className="mt-2">
                    <summary className="text-sm text-gray-600 cursor-pointer">View Details</summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual Service Tests */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Individual Service Tests</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries({
            neon: 'Neon PostgreSQL',
            auth: 'Neon Auth (Stack)',
            bedrock: 'AWS Bedrock',
            s3: 'AWS S3',
            mistral: 'Mistral OCR',
            llamaindex: 'LlamaIndex'
          }).map(([service, label]) => (
            <div key={service} className="border rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">{label}</h3>
                <button
                  onClick={() => runIndividualTest(service)}
                  className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-sm transition-colors"
                >
                  Test
                </button>
              </div>

              {individualTests[service] && (
                <div>
                  <div className={`flex items-center space-x-2 mb-2 ${getStatusColor(individualTests[service]!.success)}`}>
                    <span>{getStatusIcon(individualTests[service]!.success)}</span>
                    <span className="text-sm font-medium">
                      {individualTests[service]!.success ? 'Connected' : 'Failed'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {individualTests[service]!.message}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Environment Variables Check */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Environment Setup</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p>Required environment variables for Amplify deployment:</p>
          <ul className="list-disc list-inside space-y-1 font-mono text-xs">
            <li>NEXT_PUBLIC_STACK_PROJECT_ID</li>
            <li>NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY</li>
            <li>STACK_SECRET_SERVER_KEY</li>
            <li>DATABASE_URL</li>
            <li>BAWS_ACCESS_KEY_ID</li>
            <li>BAWS_SECRET_ACCESS_KEY</li>
            <li>DEFAULT_REGION</li>
            <li>BEDROCK_REGION</li>
            <li>MISTRAL_API_KEY</li>
            <li>LLAMAINDEX_API_KEY</li>
          </ul>
        </div>
      </div>
    </div>
  );
}