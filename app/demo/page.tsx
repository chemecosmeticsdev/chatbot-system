'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TestResult {
  success: boolean;
  service: string;
  message: string;
  data?: any;
  timestamp: string;
}

export default function DemoPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string>('');

  useEffect(() => {
    // Auto-run tests when page loads
    runAllTests();
  }, []);

  const runAllTests = async () => {
    setIsLoading(true);
    setTestResults([]);

    try {
      const response = await fetch('/api/test-all', {
        cache: 'no-store'
      });
      const data = await response.json();

      setTestResults(data.results || []);

      // Generate summary
      const passed = data.summary?.passed || 0;
      const total = data.summary?.total || 0;
      const failed = total - passed;

      let summaryText = `## API Integration Test Summary\n\n`;
      summaryText += `**Total Services**: ${total}\n`;
      summaryText += `**Passed**: ${passed} ✅\n`;
      summaryText += `**Failed**: ${failed} ❌\n\n`;

      summaryText += `### Service Status:\n\n`;
      data.results?.forEach((result: TestResult) => {
        const status = result.success ? '✅' : '❌';
        summaryText += `- **${result.service.toUpperCase()}**: ${status} ${result.message}\n`;
      });

      summaryText += `\n### Key Findings:\n\n`;
      summaryText += `- **Neon PostgreSQL**: ${data.results?.find((r: TestResult) => r.service === 'neon')?.success ? 'Operational' : 'Needs attention'}\n`;
      summaryText += `- **Authentication**: ${data.results?.find((r: TestResult) => r.service === 'neon-auth')?.success ? 'Ready for user management' : 'Configuration needed'}\n`;
      summaryText += `- **AWS Bedrock**: ${data.results?.find((r: TestResult) => r.service === 'bedrock')?.success ? 'Embeddings working' : 'Check AWS credentials'}\n`;
      summaryText += `- **S3 Storage**: ${data.results?.find((r: TestResult) => r.service === 's3')?.success ? 'File storage ready' : 'Bucket setup needed'}\n`;
      summaryText += `- **OCR Services**: ${data.results?.find((r: TestResult) => r.service === 'mistral')?.success ? 'Mistral ready' : 'Check API keys'}\n`;

      summaryText += `\n### Next Steps:\n\n`;
      if (passed === total) {
        summaryText += `🎉 **All systems operational!** Ready for development.\n\n`;
        summaryText += `- Begin implementing core features\n`;
        summaryText += `- Add Shadcn/ui components\n`;
        summaryText += `- Implement i18n (Thai/English)\n`;
        summaryText += `- Set up document processing pipeline\n`;
      } else {
        summaryText += `⚠️ **${failed} service(s) need attention before proceeding.**\n\n`;
        summaryText += `- Fix failing service connections\n`;
        summaryText += `- Verify API credentials\n`;
        summaryText += `- Check network connectivity\n`;
        summaryText += `- Re-run tests after fixes\n`;
      }

      setSummary(summaryText);

    } catch (error) {
      console.error('Failed to run tests:', error);
      setSummary(`❌ **Test Suite Failed**: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSummary = () => {
    const blob = new Blob([summary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-test-summary-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Demo Page - API Functionality Test</h1>
          <p className="text-gray-600 mb-4">
            This page demonstrates all API integrations and generates a comprehensive summary for deployment validation.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> This demo page will be removed after deployment validation is complete.
            </p>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">API Integration Tests</h2>
            <button
              onClick={runAllTests}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-3 rounded-lg font-medium"
            >
              {isLoading ? 'Running Tests...' : 'Refresh Tests'}
            </button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <span className="text-lg mr-2">
                      {result.success ? '✅' : '❌'}
                    </span>
                    <h3 className="font-semibold text-sm uppercase">
                      {result.service}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{result.message}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Report */}
        {summary && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Test Summary Report</h2>
              <button
                onClick={downloadSummary}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Download Summary
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                {summary}
              </pre>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-center space-x-4">
          <Link
            href="/"
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
          >
            ← Back to Dashboard
          </Link>
          <Link
            href="/admin"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Admin Panel →
          </Link>
        </div>
      </div>
    </div>
  );
}