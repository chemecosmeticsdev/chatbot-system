# Quickstart Guide: Chatbot Management System

**Generated**: September 20, 2025
**Context**: Development and testing guide for the comprehensive chatbot management system

## Prerequisites

### Environment Setup
```bash
# Ensure all required environment variables are set
npm run setup-env

# Install dependencies
npm ci

# Run existing API integration tests to ensure foundation is working
npm run test:api
```

### Required Services
- **Neon PostgreSQL**: Database with pgvector extension enabled
- **AWS Bedrock**: Access to Titan Text Embeddings v2 and LLM models
- **AWS S3**: Document storage with proper IAM permissions
- **Stack Auth**: Authentication and user management
- **OCR Services**: Mistral OCR and/or LlamaIndex API access

## Development Workflow

### 1. Database Setup (Extending Existing Schema)

**Create Migration Files** (preserves existing data):
```sql
-- Migration: 001_add_chatbot_tables.sql
-- Add new tables for chatbot management
-- This is NON-DESTRUCTIVE - existing tables preserved

CREATE EXTENSION IF NOT EXISTS vector;

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table for knowledge base hierarchy
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    sku VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    search_vector tsvector,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Continue with other tables from data-model.md...
```

**Run Migration**:
```bash
# Connect to Neon database and run migration
psql $DATABASE_URL -f migrations/001_add_chatbot_tables.sql
```

### 2. API Development (Extending Existing Pattern)

**Add New API Routes** (following existing patterns):
```typescript
// app/api/v1/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { neonClient } from '@/lib/neon';

export async function GET(request: NextRequest) {
  try {
    const config = getConfig();
    const client = neonClient(config.DATABASE_URL);

    // Implementation following existing API patterns
    const products = await client.query('SELECT * FROM products');

    return NextResponse.json({
      success: true,
      data: {
        products: products.rows,
        pagination: { /* pagination info */ }
      }
    });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
```

### 3. UI Component Development

**Install Shadcn/ui Components**:
```bash
# Initialize Shadcn/ui (following research recommendations)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input table dialog tabs
npx shadcn-ui@latest add navigation-menu sidebar breadcrumb
npx shadcn-ui@latest add form select textarea badge progress
```

**Create Dashboard Layout**:
```typescript
// app/dashboard/layout.tsx
import { Sidebar } from '@/components/ui/dashboard/sidebar';
import { Header } from '@/components/ui/dashboard/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 4. Vector Database Integration

**Implement Vector Search Service**:
```typescript
// lib/vector/search.ts
import { neonClient } from '@/lib/neon';

interface VectorSearchParams {
  query: string;
  k?: number;
  scoreThreshold?: number;
  filters?: {
    product_ids?: string[];
    document_types?: string[];
  };
}

export async function vectorSearch(params: VectorSearchParams) {
  const client = neonClient();

  // Generate embedding for query using AWS Titan
  const embedding = await generateEmbedding(params.query);

  // Perform similarity search
  const results = await client.query(`
    SELECT
      dc.id as chunk_id,
      dc.chunk_text as content,
      dc.embedding <=> $1 as similarity_score,
      d.title as document_title,
      p.name as product_name
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    JOIN products p ON d.product_id = p.id
    WHERE dc.embedding <=> $1 < $2
    ORDER BY dc.embedding <=> $1
    LIMIT $3
  `, [embedding, params.scoreThreshold || 0.7, params.k || 5]);

  return results.rows;
}
```

## Testing Scenarios

### 1. End-to-End User Workflows

**Scenario: Admin Creates Knowledge Base and Chatbot**
```typescript
// tests/e2e/chatbot-creation.spec.ts
import { test, expect } from '@playwright/test';

test('Admin can create knowledge base and chatbot', async ({ page }) => {
  // Step 1: Login as admin
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Step 2: Create product
  await page.goto('/dashboard/products');
  await page.getByRole('button', { name: 'Add Product' }).click();
  await page.getByLabel('Product Name').fill('Test Product');
  await page.getByLabel('Category').fill('Electronics');
  await page.getByRole('button', { name: 'Create Product' }).click();

  // Step 3: Upload documents
  await page.getByRole('button', { name: 'Upload Documents' }).click();
  await page.setInputFiles('input[type="file"]', 'test-files/sample.pdf');
  await page.getByRole('button', { name: 'Upload' }).click();

  // Step 4: Wait for processing
  await expect(page.getByText('Processing completed')).toBeVisible({ timeout: 30000 });

  // Step 5: Create chatbot
  await page.goto('/dashboard/chatbots');
  await page.getByRole('button', { name: 'Create Chatbot' }).click();
  await page.getByLabel('Chatbot Name').fill('Test Assistant');
  await page.getByLabel('LLM Model').selectOption('claude-3-haiku');
  await page.getByLabel('System Prompt').fill('You are a helpful assistant.');
  await page.getByRole('button', { name: 'Create Chatbot' }).click();

  // Step 6: Test chatbot in playground
  await page.goto('/dashboard/playground');
  await page.getByLabel('Select Chatbot').selectOption('Test Assistant');
  await page.getByLabel('Message').fill('What can you tell me about Test Product?');
  await page.getByRole('button', { name: 'Send' }).click();

  // Verify response includes product information
  await expect(page.getByText(/Test Product/)).toBeVisible({ timeout: 10000 });
});
```

**Scenario: Vector Search Performance**
```typescript
// tests/integration/vector-search.spec.ts
import { test, expect } from '@playwright/test';

test('Vector search returns relevant results quickly', async ({ request }) => {
  const startTime = Date.now();

  const response = await request.post('/api/v1/search/vector', {
    data: {
      query: 'product specifications',
      k: 5,
      score_threshold: 0.7
    }
  });

  const endTime = Date.now();
  const responseTime = endTime - startTime;

  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.data.results).toHaveLength(5);
  expect(responseTime).toBeLessThan(200); // Performance requirement

  // Verify result structure
  const result = data.data.results[0];
  expect(result).toHaveProperty('chunk_id');
  expect(result).toHaveProperty('content');
  expect(result).toHaveProperty('similarity_score');
  expect(result.similarity_score).toBeGreaterThan(0.7);
});
```

### 2. API Contract Testing

**Products API Contract Tests**:
```typescript
// tests/contract/products.spec.ts
import { test, expect } from '@playwright/test';

test('GET /api/v1/products follows contract', async ({ request }) => {
  const response = await request.get('/api/v1/products');
  expect(response.ok()).toBeTruthy();

  const data = await response.json();

  // Verify response structure matches OpenAPI spec
  expect(data).toHaveProperty('success');
  expect(data).toHaveProperty('data');
  expect(data.data).toHaveProperty('products');
  expect(data.data).toHaveProperty('pagination');

  // Verify product structure
  if (data.data.products.length > 0) {
    const product = data.data.products[0];
    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('category');
    expect(product).toHaveProperty('status');
    expect(product.status).toMatch(/^(active|inactive|draft|archived)$/);
  }
});

test('POST /api/v1/products validates input', async ({ request }) => {
  // Test missing required fields
  const response = await request.post('/api/v1/products', {
    data: {
      description: 'Missing name and category'
    }
  });

  expect(response.status()).toBe(400);
  const data = await response.json();
  expect(data.success).toBe(false);
  expect(data.error).toContain('name');
  expect(data.error).toContain('category');
});
```

## Performance Validation

### Vector Database Performance Tests
```typescript
// tests/performance/vector-operations.spec.ts
import { test, expect } from '@playwright/test';

test('Vector index performance meets requirements', async ({ request }) => {
  const testQueries = [
    'product specifications',
    'safety information',
    'installation guide',
    'warranty details',
    'technical support'
  ];

  const responseTimes: number[] = [];

  for (const query of testQueries) {
    const startTime = Date.now();

    const response = await request.post('/api/v1/search/vector', {
      data: { query, k: 10 }
    });

    const endTime = Date.now();
    responseTimes.push(endTime - startTime);

    expect(response.ok()).toBeTruthy();
  }

  const avgResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
  const p95ResponseTime = responseTimes.sort()[Math.floor(responseTimes.length * 0.95)];

  console.log(`Average response time: ${avgResponseTime}ms`);
  console.log(`95th percentile: ${p95ResponseTime}ms`);

  // Performance requirements from research.md
  expect(avgResponseTime).toBeLessThan(200);
  expect(p95ResponseTime).toBeLessThan(500);
});
```

## Deployment Validation

### Pre-deployment Checklist
```bash
# 1. Run all tests
npm run test:all

# 2. Build verification
npm run build

# 3. Environment validation
npm run setup-env

# 4. Database health check
npm run test:api

# 5. Performance baseline
npm run test:performance
```

### Deployment Steps (Non-destructive)
```bash
# 1. Create feature branch
git checkout -b feature/chatbot-management

# 2. Commit changes incrementally
git add . && git commit -m "Add: Chatbot management database schema"
git add . && git commit -m "Add: Knowledge base API endpoints"
git add . && git commit -m "Add: Shadcn/ui dashboard components"

# 3. Push to GitHub (triggers CI/CD)
git push origin feature/chatbot-management

# 4. Monitor Amplify build
# Check AWS Amplify console for build status

# 5. Test deployed preview
# Verify all functionality in preview environment
```

## Monitoring and Observability

### Extend Existing Sentry Integration
```typescript
// lib/monitoring/chatbot-monitoring.ts
import * as Sentry from '@sentry/nextjs';

export function trackChatbotInteraction(data: {
  chatbotId: string;
  messageId: string;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
}) {
  Sentry.addBreadcrumb({
    category: 'chatbot',
    message: `Interaction with chatbot ${data.chatbotId}`,
    level: data.success ? 'info' : 'error',
    data
  });

  if (!data.success && data.errorMessage) {
    Sentry.captureException(new Error(data.errorMessage), {
      tags: {
        component: 'chatbot',
        chatbot_id: data.chatbotId
      },
      extra: data
    });
  }
}
```

## Success Criteria Validation

### Automated Validation Tests
```typescript
// tests/success-criteria.spec.ts
import { test, expect } from '@playwright/test';

test('System meets performance requirements', async ({ page, request }) => {
  // Page load time < 2 seconds
  const startTime = Date.now();
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(2000);

  // Vector search < 200ms
  const searchStart = Date.now();
  const response = await request.post('/api/v1/search/vector', {
    data: { query: 'test query' }
  });
  const searchTime = Date.now() - searchStart;
  expect(searchTime).toBeLessThan(200);
  expect(response.ok()).toBeTruthy();

  // System uptime check
  const healthResponse = await request.get('/api/health');
  expect(healthResponse.ok()).toBeTruthy();
});

test('Thai language support works correctly', async ({ page }) => {
  await page.goto('/dashboard?lang=th');

  // Check Thai text rendering
  await expect(page.getByText(/แดชบอร์ด/)).toBeVisible();

  // Test Thai input
  await page.getByLabel('ชื่อผลิตภัณฑ์').fill('ผลิตภัณฑ์ทดสอบ');

  // Verify no layout breaking
  const element = page.getByLabel('ชื่อผลิตภัณฑ์');
  const boundingBox = await element.boundingBox();
  expect(boundingBox?.width).toBeGreaterThan(0);
});
```

## Next Steps

1. **Run Implementation**: Execute the tasks generated by `/tasks` command
2. **Incremental Testing**: Test each component as it's built
3. **Performance Monitoring**: Monitor real performance against requirements
4. **User Acceptance**: Validate against feature specification acceptance criteria
5. **Production Deployment**: Deploy to main branch after all validations pass

---
*Quickstart guide completed: September 20, 2025*
*Ready for implementation phase*