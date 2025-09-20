/**
 * Product Model
 *
 * Represents products in the knowledge base system.
 * Products serve as containers for documents and are used to organize knowledge.
 */

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  category: string;
  sku?: string;
  status: ProductStatus;
  metadata: Record<string, any>;
  search_vector?: string; // PostgreSQL tsvector
  created_at: Date;
  updated_at: Date;
  created_by?: string; // Stack Auth user ID
}

export type ProductStatus = 'active' | 'inactive' | 'draft' | 'archived';

export interface CreateProductRequest {
  name: string;
  description?: string;
  category: string;
  sku?: string;
  status?: ProductStatus;
  metadata?: Record<string, any>;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  category?: string;
  sku?: string;
  status?: ProductStatus;
  metadata?: Record<string, any>;
}

export interface ProductWithDocuments extends Product {
  documents: ProductDocument[];
}

export interface ProductDocument {
  id: string;
  title: string;
  document_type: string;
  file_size: number;
  processing_status: string;
  chunk_count: number;
  created_at: Date;
}

export interface ProductListFilters {
  category?: string;
  status?: ProductStatus;
  search?: string;
  organization_id?: string;
}

export interface ProductListResponse {
  products: Product[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

/**
 * Product validation schema
 */
export class ProductValidation {
  static validateCreate(data: any): CreateProductRequest {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      throw new Error('Product name is required and must be a non-empty string');
    }

    if (!data.category || typeof data.category !== 'string' || data.category.trim().length === 0) {
      throw new Error('Product category is required and must be a non-empty string');
    }

    if (data.name.length > 255) {
      throw new Error('Product name must be 255 characters or less');
    }

    if (data.category.length > 100) {
      throw new Error('Product category must be 100 characters or less');
    }

    if (data.sku && (typeof data.sku !== 'string' || data.sku.length > 50)) {
      throw new Error('Product SKU must be a string of 50 characters or less');
    }

    if (data.status && !['active', 'inactive', 'draft', 'archived'].includes(data.status)) {
      throw new Error('Product status must be one of: active, inactive, draft, archived');
    }

    return {
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      category: data.category.trim(),
      sku: data.sku?.trim() || undefined,
      status: data.status || 'active',
      metadata: data.metadata || {}
    };
  }

  static validateUpdate(data: any): UpdateProductRequest {
    const updates: UpdateProductRequest = {};

    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || data.name.trim().length === 0) {
        throw new Error('Product name must be a non-empty string');
      }
      if (data.name.length > 255) {
        throw new Error('Product name must be 255 characters or less');
      }
      updates.name = data.name.trim();
    }

    if (data.category !== undefined) {
      if (typeof data.category !== 'string' || data.category.trim().length === 0) {
        throw new Error('Product category must be a non-empty string');
      }
      if (data.category.length > 100) {
        throw new Error('Product category must be 100 characters or less');
      }
      updates.category = data.category.trim();
    }

    if (data.description !== undefined) {
      updates.description = data.description?.trim() || undefined;
    }

    if (data.sku !== undefined) {
      if (data.sku && (typeof data.sku !== 'string' || data.sku.length > 50)) {
        throw new Error('Product SKU must be a string of 50 characters or less');
      }
      updates.sku = data.sku?.trim() || undefined;
    }

    if (data.status !== undefined) {
      if (!['active', 'inactive', 'draft', 'archived'].includes(data.status)) {
        throw new Error('Product status must be one of: active, inactive, draft, archived');
      }
      updates.status = data.status;
    }

    if (data.metadata !== undefined) {
      if (typeof data.metadata !== 'object' || data.metadata === null || Array.isArray(data.metadata)) {
        throw new Error('Product metadata must be an object');
      }
      updates.metadata = data.metadata;
    }

    return updates;
  }

  static validateUUID(id: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error('Invalid UUID format');
    }
  }
}

/**
 * Product utility functions
 */
export class ProductUtils {
  /**
   * Generate a search-friendly slug from product name
   */
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  /**
   * Calculate completion percentage for product setup
   */
  static calculateCompleteness(product: Product, documentCount: number): number {
    let score = 0;
    const maxScore = 5;

    // Basic information
    if (product.name) score += 1;
    if (product.description) score += 1;
    if (product.category) score += 1;

    // Has documents
    if (documentCount > 0) score += 1;

    // Is active
    if (product.status === 'active') score += 1;

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Format product for display
   */
  static formatForDisplay(product: Product): any {
    return {
      ...product,
      created_at: product.created_at.toISOString(),
      updated_at: product.updated_at.toISOString(),
      slug: this.generateSlug(product.name)
    };
  }
}