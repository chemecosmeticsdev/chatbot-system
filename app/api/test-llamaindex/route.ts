import { NextResponse } from 'next/server';
import { getConfig, validateEnvironment } from '@/lib/config';
import axios from 'axios';

async function testLlamaIndexOCR(): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const config = getConfig();

    // Test LlamaIndex API connection
    const response = await axios.post(
      'https://api.llamaindex.ai/api/v1/parsing/upload',
      {
        file_type: 'text/plain',
        base64_file: Buffer.from('Test document content for API validation').toString('base64')
      },
      {
        headers: {
          'Authorization': `Bearer ${config.LLAMAINDEX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    return {
      success: true,
      message: 'LlamaIndex API connection successful',
      data: {
        jobId: response.data.id || 'unknown',
        status: response.data.status || 'submitted',
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        message: `LlamaIndex API error: ${error.response?.status} - ${error.response?.statusText || error.message}`
      };
    }
    return {
      success: false,
      message: `LlamaIndex connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function GET() {
  try {
    // Validate environment
    const envCheck = validateEnvironment();
    if (!envCheck.isValid) {
      return NextResponse.json({
        success: false,
        service: 'llamaindex',
        message: `Missing environment variables: ${envCheck.missing.join(', ')}`,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test LlamaIndex connection
    const result = await testLlamaIndexOCR();

    return NextResponse.json({
      success: result.success,
      service: 'llamaindex',
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    }, { status: result.success ? 200 : 500 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      service: 'llamaindex',
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}