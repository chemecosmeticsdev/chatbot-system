import { NextResponse } from 'next/server';
import { getConfig, validateEnvironment } from '@/lib/config';
import axios from 'axios';

async function testMistralOCR(): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const config = getConfig();

    // Test Mistral API connection with a simple request
    const response = await axios.post(
      'https://api.mistral.ai/v1/chat/completions',
      {
        model: 'mistral-tiny', // Using a small model for testing
        messages: [
          {
            role: 'user',
            content: 'Test connection - respond with "API working"'
          }
        ],
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${config.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return {
      success: true,
      message: 'Mistral API connection successful',
      data: {
        model: 'mistral-tiny',
        response: response.data.choices?.[0]?.message?.content || 'No response',
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        message: `Mistral API error: ${error.response?.status} - ${error.response?.statusText || error.message}`
      };
    }
    return {
      success: false,
      message: `Mistral connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
        service: 'mistral',
        message: `Missing environment variables: ${envCheck.missing.join(', ')}`,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test Mistral connection
    const result = await testMistralOCR();

    return NextResponse.json({
      success: result.success,
      service: 'mistral',
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    }, { status: result.success ? 200 : 500 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      service: 'mistral',
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}