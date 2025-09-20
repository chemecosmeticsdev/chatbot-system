import { test, expect } from '@playwright/test';

/**
 * Contract Tests: Products API
 *
 * These tests validate the Products API endpoints according to the OpenAPI contract.
 * Following TDD approach - these tests MUST fail initially.
 */

const API_BASE = '/api/v1';

test.describe('Products API Contract Tests', () => {
  test.describe('POST /api/v1/products', () => {
    test('should create a new product with valid data', async ({ request }) => {
      const productData = {
        name: 'Test Product',
        description: 'A test product for validation',
        category: 'Electronics',
        sku: 'TEST-001',
        status: 'active'
      };

      const response = await request.post(`${API_BASE}/products`, {
        data: productData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Contract validation
      expect(response.status()).toBe(201);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const product = responseData.data;
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name', productData.name);
      expect(product).toHaveProperty('category', productData.category);
      expect(product).toHaveProperty('status', productData.status);
      expect(product).toHaveProperty('created_at');
      expect(product).toHaveProperty('updated_at');
    });

    test('should return 400 for missing required fields', async ({ request }) => {
      const invalidData = {
        description: 'Missing name and category'
      };

      const response = await request.post(`${API_BASE}/products`, {
        data: invalidData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('error');
      expect(responseData.error).toContain('name');
      expect(responseData.error).toContain('category');
    });

    test('should return 400 for invalid status enum', async ({ request }) => {
      const invalidData = {
        name: 'Test Product',
        category: 'Electronics',
        status: 'invalid_status'
      };

      const response = await request.post(`${API_BASE}/products`, {
        data: invalidData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('error');
    });
  });

  test.describe('GET /api/v1/products', () => {
    test('should return paginated list of products', async ({ request }) => {
      const response = await request.get(`${API_BASE}/products`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const data = responseData.data;
      expect(data).toHaveProperty('products');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.products)).toBe(true);

      // Pagination validation
      const pagination = data.pagination;
      expect(pagination).toHaveProperty('current_page');
      expect(pagination).toHaveProperty('total_pages');
      expect(pagination).toHaveProperty('total_items');
      expect(pagination).toHaveProperty('items_per_page');
    });

    test('should support filtering by category', async ({ request }) => {
      const response = await request.get(`${API_BASE}/products?category=Electronics`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);

      // All returned products should match the category filter
      const products = responseData.data.products;
      if (products.length > 0) {
        products.forEach((product: any) => {
          expect(product.category).toBe('Electronics');
        });
      }
    });

    test('should support filtering by status', async ({ request }) => {
      const response = await request.get(`${API_BASE}/products?status=active`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);

      // All returned products should match the status filter
      const products = responseData.data.products;
      if (products.length > 0) {
        products.forEach((product: any) => {
          expect(product.status).toBe('active');
        });
      }
    });

    test('should support pagination parameters', async ({ request }) => {
      const response = await request.get(`${API_BASE}/products?page=1&limit=5`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);

      const data = responseData.data;
      expect(data.products.length).toBeLessThanOrEqual(5);
      expect(data.pagination.current_page).toBe(1);
      expect(data.pagination.items_per_page).toBe(5);
    });
  });

  test.describe('GET /api/v1/products/{productId}', () => {
    test('should return product details for valid ID', async ({ request }) => {
      // First create a product to test with
      const createResponse = await request.post(`${API_BASE}/products`, {
        data: {
          name: 'Test Product for Get',
          category: 'Electronics',
          description: 'Product for testing GET endpoint'
        }
      });

      expect(createResponse.status()).toBe(201);
      const createData = await createResponse.json();
      const productId = createData.data.id;

      // Now test the GET endpoint
      const response = await request.get(`${API_BASE}/products/${productId}`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const product = responseData.data;
      expect(product).toHaveProperty('id', productId);
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('category');
      expect(product).toHaveProperty('documents'); // Should include associated documents
    });

    test('should return 404 for non-existent product', async ({ request }) => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request.get(`${API_BASE}/products/${fakeId}`);

      expect(response.status()).toBe(404);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('error');
    });

    test('should return 400 for invalid UUID format', async ({ request }) => {
      const invalidId = 'not-a-uuid';
      const response = await request.get(`${API_BASE}/products/${invalidId}`);

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('error');
    });
  });

  test.describe('PUT /api/v1/products/{productId}', () => {
    test('should update product with valid data', async ({ request }) => {
      // First create a product to test with
      const createResponse = await request.post(`${API_BASE}/products`, {
        data: {
          name: 'Original Product',
          category: 'Electronics',
          description: 'Original description'
        }
      });

      const createData = await createResponse.json();
      const productId = createData.data.id;

      // Update the product
      const updateData = {
        name: 'Updated Product',
        description: 'Updated description',
        status: 'inactive'
      };

      const response = await request.put(`${API_BASE}/products/${productId}`, {
        data: updateData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const product = responseData.data;
      expect(product).toHaveProperty('name', updateData.name);
      expect(product).toHaveProperty('description', updateData.description);
      expect(product).toHaveProperty('status', updateData.status);
      expect(product.updated_at).not.toBe(product.created_at);
    });
  });

  test.describe('DELETE /api/v1/products/{productId}', () => {
    test('should delete product and return success message', async ({ request }) => {
      // First create a product to test with
      const createResponse = await request.post(`${API_BASE}/products`, {
        data: {
          name: 'Product to Delete',
          category: 'Electronics'
        }
      });

      const createData = await createResponse.json();
      const productId = createData.data.id;

      // Delete the product
      const response = await request.delete(`${API_BASE}/products/${productId}`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('message');

      // Verify product is actually deleted
      const getResponse = await request.get(`${API_BASE}/products/${productId}`);
      expect(getResponse.status()).toBe(404);
    });
  });
});