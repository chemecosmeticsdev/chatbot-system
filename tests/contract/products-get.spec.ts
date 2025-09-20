import { test, expect } from '@playwright/test';

/**
 * Contract Tests: Products GET API
 *
 * These tests validate the Products GET API endpoints according to the OpenAPI contract.
 * Following TDD approach - these tests MUST fail initially.
 */

const API_BASE = '/api/v1';

test.describe('Products GET API Contract Tests', () => {
  test.describe('GET /api/v1/products/{id}', () => {
    test('should retrieve a specific product by ID', async ({ request }) => {
      // Note: This test will fail initially as the API endpoint doesn't exist yet
      const testProductId = '550e8400-e29b-41d4-a716-446655440000'; // Mock UUID

      const response = await request.get(`${API_BASE}/products/${testProductId}`);

      // Contract validation
      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const product = responseData.data;
      expect(product).toHaveProperty('id', testProductId);
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('description');
      expect(product).toHaveProperty('category');
      expect(product).toHaveProperty('sku');
      expect(product).toHaveProperty('status');
      expect(product).toHaveProperty('metadata');
      expect(product).toHaveProperty('created_at');
      expect(product).toHaveProperty('updated_at');
      expect(product).toHaveProperty('created_by');
    });

    test('should return 404 for non-existent product', async ({ request }) => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request.get(`${API_BASE}/products/${nonExistentId}`);

      expect(response.status()).toBe(404);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('error');
      expect(responseData.error).toContain('Product not found');
    });

    test('should return 400 for invalid UUID format', async ({ request }) => {
      const invalidId = 'invalid-uuid';

      const response = await request.get(`${API_BASE}/products/${invalidId}`);

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('error');
      expect(responseData.error).toContain('Invalid ID format');
    });
  });

  test.describe('GET /api/v1/products (list)', () => {
    test('should retrieve paginated list of products', async ({ request }) => {
      const response = await request.get(`${API_BASE}/products`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const data = responseData.data;
      expect(data).toHaveProperty('products');
      expect(data).toHaveProperty('pagination');

      // Validate pagination structure
      const pagination = data.pagination;
      expect(pagination).toHaveProperty('page');
      expect(pagination).toHaveProperty('limit');
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('totalPages');

      // Validate products array structure
      expect(Array.isArray(data.products)).toBe(true);

      if (data.products.length > 0) {
        const product = data.products[0];
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('category');
        expect(product).toHaveProperty('status');
      }
    });

    test('should support pagination parameters', async ({ request }) => {
      const response = await request.get(`${API_BASE}/products?page=1&limit=5`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData.data.pagination.page).toBe(1);
      expect(responseData.data.pagination.limit).toBe(5);
      expect(responseData.data.products.length).toBeLessThanOrEqual(5);
    });

    test('should support category filter', async ({ request }) => {
      const category = 'Electronics';
      const response = await request.get(`${API_BASE}/products?category=${category}`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      const products = responseData.data.products;

      // All returned products should match the category filter
      products.forEach((product: any) => {
        expect(product.category).toBe(category);
      });
    });

    test('should support status filter', async ({ request }) => {
      const status = 'active';
      const response = await request.get(`${API_BASE}/products?status=${status}`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      const products = responseData.data.products;

      // All returned products should match the status filter
      products.forEach((product: any) => {
        expect(product.status).toBe(status);
      });
    });

    test('should support search functionality', async ({ request }) => {
      const searchTerm = 'Sample';
      const response = await request.get(`${API_BASE}/products?search=${searchTerm}`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      const products = responseData.data.products;

      // Products should contain the search term in name or description
      products.forEach((product: any) => {
        const searchMatch =
          product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchTerm.toLowerCase());
        expect(searchMatch).toBe(true);
      });
    });

    test('should validate pagination limits', async ({ request }) => {
      // Test maximum limit enforcement
      const response = await request.get(`${API_BASE}/products?limit=150`);

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData.error).toContain('Limit cannot exceed 100');
    });

    test('should return empty results for invalid category', async ({ request }) => {
      const invalidCategory = 'NonExistentCategory';
      const response = await request.get(`${API_BASE}/products?category=${invalidCategory}`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData.data.products).toHaveLength(0);
      expect(responseData.data.pagination.total).toBe(0);
    });
  });
});