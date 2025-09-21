import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { getConfig } from './config';

let s3Client: S3Client | null = null;
let bedrockClient: BedrockRuntimeClient | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    const config = getConfig();
    s3Client = new S3Client({
      region: config.DEFAULT_REGION,
      credentials: {
        accessKeyId: config.BAWS_ACCESS_KEY_ID,
        secretAccessKey: config.BAWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

export function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    const config = getConfig();
    bedrockClient = new BedrockRuntimeClient({
      region: config.BEDROCK_REGION,
      credentials: {
        accessKeyId: config.BAWS_ACCESS_KEY_ID,
        secretAccessKey: config.BAWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return bedrockClient;
}

export async function testS3Connection(): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const config = getConfig();

    // Check if S3 bucket is configured
    if (!config.S3_BUCKET_NAME) {
      return {
        success: false,
        message: 'S3 bucket not configured - S3_BUCKET_NAME environment variable is required'
      };
    }

    const s3 = getS3Client();

    // Test upload a small text file
    const testContent = `Test file created at ${new Date().toISOString()}`;
    const uploadCommand = new PutObjectCommand({
      Bucket: config.S3_BUCKET_NAME,
      Key: `test-${Date.now()}.txt`,
      Body: testContent,
      ContentType: 'text/plain',
    });

    await s3.send(uploadCommand);

    return {
      success: true,
      message: `S3 connection and upload successful to bucket: ${config.S3_BUCKET_NAME}`,
      data: {
        bucket: config.S3_BUCKET_NAME,
        uploadedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Provide helpful error messages for common issues
    if (errorMessage.includes('NoSuchBucket')) {
      return {
        success: false,
        message: `S3 bucket does not exist. Please create bucket or update S3_BUCKET_NAME environment variable. Error: ${errorMessage}`
      };
    }

    if (errorMessage.includes('AccessDenied')) {
      return {
        success: false,
        message: `S3 access denied. Please check AWS credentials and bucket permissions. Error: ${errorMessage}`
      };
    }

    return {
      success: false,
      message: `S3 connection test failed: ${errorMessage}`
    };
  }
}

export async function testBedrockConnection(): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const bedrock = getBedrockClient();

    // Test Amazon Titan Text Embeddings V2
    const input = {
      modelId: 'amazon.titan-embed-text-v2:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: 'Test embedding generation for API validation',
        dimensions: 512,
        normalize: true
      })
    };

    const command = new InvokeModelCommand(input);
    const response = await bedrock.send(command);

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return {
      success: true,
      message: 'AWS Bedrock Titan embeddings connection successful',
      data: {
        modelId: input.modelId,
        embeddingDimensions: responseBody.embedding?.length || 'unknown',
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Bedrock connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}