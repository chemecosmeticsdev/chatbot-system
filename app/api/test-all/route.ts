import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

interface TestResult {
  success: boolean;
  service: string;
  message: string;
  data?: any;
  timestamp: string;
}

async function runAllTests(): Promise<TestResult[]> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const testEndpoints = [
    '/api/test-neon',
    '/api/test-auth',
    '/api/test-bedrock',
    '/api/test-s3',
    '/api/test-mistral',
    '/api/test-llamaindex'
  ];

  const results: TestResult[] = [];

  for (const endpoint of testEndpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      const result = await response.json();
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        service: endpoint.replace('/api/test-', ''),
        message: `Failed to test ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  return results;
}

async function generateTestReport(results: TestResult[]): Promise<void> {
  const timestamp = new Date().toISOString();
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  const report = `# API Integration Test Results

**Test Run:** ${timestamp}
**Overall Status:** ${successCount}/${totalCount} services passing

## Summary

${results.map(result => `
### ${result.service.toUpperCase()}
- **Status:** ${result.success ? '✅ PASS' : '❌ FAIL'}
- **Message:** ${result.message}
- **Timestamp:** ${result.timestamp}
${result.data ? `- **Data:** \`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\`` : ''}
`).join('\n')}

## Environment Variables Check

All required environment variables for this test run:
- NEXT_PUBLIC_STACK_PROJECT_ID
- NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
- STACK_SECRET_SERVER_KEY
- DATABASE_URL
- BAWS_ACCESS_KEY_ID
- BAWS_SECRET_ACCESS_KEY
- DEFAULT_REGION
- BEDROCK_REGION
- MISTRAL_API_KEY
- LLAMAINDEX_API_KEY

## Next Steps

${successCount === totalCount
  ? '🎉 All services are working! Ready for development.'
  : `⚠️ ${totalCount - successCount} service(s) need attention before proceeding.`}

---
*Generated automatically by the API test suite*
`;

  try {
    const docsPath = join(process.cwd(), 'docs', 'api-test-results.md');
    await writeFile(docsPath, report, 'utf8');
  } catch (error) {
    console.error('Failed to write test report:', error);
  }
}

export async function GET() {
  try {
    const results = await runAllTests();
    await generateTestReport(results);

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return NextResponse.json({
      success: successCount === totalCount,
      summary: {
        total: totalCount,
        passed: successCount,
        failed: totalCount - successCount
      },
      results,
      timestamp: new Date().toISOString(),
      reportGenerated: true
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}