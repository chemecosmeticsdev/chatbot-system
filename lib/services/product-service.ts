/**
 * Product Service
 *
 * Handles CRUD operations for products in the knowledge base system.
 * Integrates with Neon PostgreSQL database.
 */

import { Client } from 'pg';
import {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  ProductWithDocuments,
  ProductListFilters,
  ProductListResponse,
  ProductValidation,
  ProductUtils
} from '@/lib/models/product';

export class ProductService {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Create a new product
   */
  async create(data: CreateProductRequest, organizationId: string, createdBy?: string): Promise<Product> {
    const validatedData = ProductValidation.validateCreate(data);

    const query = `
      INSERT INTO products (
        organization_id, name, description, category, sku, status, metadata, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      organizationId,
      validatedData.name,
      validatedData.description,
      validatedData.category,
      validatedData.sku,
      validatedData.status,
      JSON.stringify(validatedData.metadata),
      createdBy
    ];

    try {
      const result = await this.client.query(query, values);
      return this.mapRowToProduct(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505' && error.constraint === 'idx_products_sku_org') {
        throw new Error('A product with this SKU already exists in your organization');
      }
      throw new Error(`Failed to create product: ${error.message}`);
    }
  }

  /**
   * Get product by ID
   */
  async getById(id: string, organizationId: string): Promise<Product | null> {
    ProductValidation.validateUUID(id);

    const query = `
      SELECT * FROM products
      WHERE id = $1 AND organization_id = $2
    `;

    try {
      const result = await this.client.query(query, [id, organizationId]);
      return result.rows.length > 0 ? this.mapRowToProduct(result.rows[0]) : null;
    } catch (error: any) {
      throw new Error(`Failed to get product: ${error.message}`);
    }
  }

  /**
   * Get product with associated documents
   */
  async getByIdWithDocuments(id: string, organizationId: string): Promise<ProductWithDocuments | null> {
    ProductValidation.validateUUID(id);

    const query = `
      SELECT
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', d.id,
              'title', d.title,
              'document_type', d.document_type,
              'file_size', d.file_size,
              'processing_status', d.processing_status,
              'chunk_count', COALESCE(chunk_counts.count, 0),
              'created_at', d.created_at
            )
          ) FILTER (WHERE d.id IS NOT NULL),
          '[]'::json
        ) as documents
      FROM products p
      LEFT JOIN documents d ON p.id = d.product_id
      LEFT JOIN (
        SELECT document_id, COUNT(*) as count
        FROM document_chunks
        GROUP BY document_id
      ) chunk_counts ON d.id = chunk_counts.document_id
      WHERE p.id = $1 AND p.organization_id = $2
      GROUP BY p.id
    `;

    try {
      const result = await this.client.query(query, [id, organizationId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const product = this.mapRowToProduct(row);

      return {
        ...product,
        documents: row.documents || []
      };
    } catch (error: any) {
      throw new Error(`Failed to get product with documents: ${error.message}`);
    }
  }

  /**
   * Update product
   */
  async update(id: string, data: UpdateProductRequest, organizationId: string): Promise<Product> {
    ProductValidation.validateUUID(id);
    const validatedData = ProductValidation.validateUpdate(data);

    if (Object.keys(validatedData).length === 0) {
      throw new Error('No valid fields provided for update');
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(validatedData)) {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(key === 'metadata' ? JSON.stringify(value) : value);
        paramCount++;
      }
    }

    const query = `
      UPDATE products
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount} AND organization_id = $${paramCount + 1}
      RETURNING *
    `;

    values.push(id, organizationId);

    try {
      const result = await this.client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Product not found or access denied');
      }

      return this.mapRowToProduct(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505' && error.constraint === 'idx_products_sku_org') {
        throw new Error('A product with this SKU already exists in your organization');
      }
      throw new Error(`Failed to update product: ${error.message}`);
    }
  }

  /**
   * Delete product
   */
  async delete(id: string, organizationId: string): Promise<void> {
    ProductValidation.validateUUID(id);

    // Check if product has documents
    const checkQuery = `
      SELECT COUNT(*) as doc_count FROM documents
      WHERE product_id = $1
    `;

    const documentCount = await this.client.query(checkQuery, [id]);

    if (parseInt(documentCount.rows[0].doc_count) > 0) {
      throw new Error('Cannot delete product that has associated documents. Delete documents first.');
    }

    const query = `
      DELETE FROM products
      WHERE id = $1 AND organization_id = $2
      RETURNING id
    `;

    try {
      const result = await this.client.query(query, [id, organizationId]);

      if (result.rows.length === 0) {
        throw new Error('Product not found or access denied');
      }
    } catch (error: any) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }

  /**
   * List products with filtering and pagination
   */
  async list(
    organizationId: string,
    filters: ProductListFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<ProductListResponse> {
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 20;

    const offset = (page - 1) * limit;
    const whereConditions: string[] = ['organization_id = $1'];
    const values: any[] = [organizationId];
    let paramCount = 2;

    // Build filter conditions
    if (filters.category) {
      whereConditions.push(`category = $${paramCount}`);
      values.push(filters.category);
      paramCount++;
    }

    if (filters.status) {
      whereConditions.push(`status = $${paramCount}`);
      values.push(filters.status);
      paramCount++;
    }

    if (filters.search) {
      whereConditions.push(`(
        name ILIKE $${paramCount} OR
        description ILIKE $${paramCount} OR
        sku ILIKE $${paramCount}
      )`);
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total FROM products
      WHERE ${whereClause}
    `;

    // Get products
    const dataQuery = `
      SELECT * FROM products
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    try {
      const [countResult, dataResult] = await Promise.all([
        this.client.query(countQuery, values),
        this.client.query(dataQuery, [...values, limit, offset])
      ]);

      const totalItems = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalItems / limit);

      return {
        products: dataResult.rows.map(row => this.mapRowToProduct(row)),
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_items: totalItems,
          items_per_page: limit
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to list products: ${error.message}`);
    }
  }

  /**
   * Search products using full-text search
   */
  async search(
    organizationId: string,
    searchQuery: string,
    limit: number = 10
  ): Promise<Product[]> {
    if (!searchQuery.trim()) {
      return [];
    }

    const query = `
      SELECT *, ts_rank(search_vector, plainto_tsquery('english', $2)) as rank
      FROM products
      WHERE organization_id = $1
        AND search_vector @@ plainto_tsquery('english', $2)
      ORDER BY rank DESC, created_at DESC
      LIMIT $3
    `;

    try {
      const result = await this.client.query(query, [organizationId, searchQuery, limit]);
      return result.rows.map(row => this.mapRowToProduct(row));
    } catch (error: any) {
      throw new Error(`Failed to search products: ${error.message}`);
    }
  }

  /**
   * Get products by category
   */
  async getByCategory(organizationId: string, category: string): Promise<Product[]> {
    const query = `
      SELECT * FROM products
      WHERE organization_id = $1 AND category = $2 AND status = 'active'
      ORDER BY name ASC
    `;

    try {
      const result = await this.client.query(query, [organizationId, category]);
      return result.rows.map(row => this.mapRowToProduct(row));
    } catch (error: any) {
      throw new Error(`Failed to get products by category: ${error.message}`);
    }
  }

  /**
   * Get product statistics
   */
  async getStatistics(organizationId: string): Promise<any> {
    const query = `
      SELECT
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE status = 'active') as active_products,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_products,
        COUNT(DISTINCT category) as unique_categories,
        AVG((
          SELECT COUNT(*) FROM documents d
          WHERE d.product_id = p.id
        )) as avg_documents_per_product
      FROM products p
      WHERE organization_id = $1
    `;

    try {
      const result = await this.client.query(query, [organizationId]);
      return result.rows[0];
    } catch (error: any) {
      throw new Error(`Failed to get product statistics: ${error.message}`);
    }
  }

  /**
   * Map database row to Product interface
   */
  private mapRowToProduct(row: any): Product {
    return {
      id: row.id,
      organization_id: row.organization_id,
      name: row.name,
      description: row.description,
      category: row.category,
      sku: row.sku,
      status: row.status,
      metadata: row.metadata || {},
      search_vector: row.search_vector,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      created_by: row.created_by
    };
  }
}