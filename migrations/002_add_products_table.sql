-- Migration: 002_add_products_table.sql
-- Description: Add products table for knowledge base hierarchy
-- Created: 2025-09-20
-- Dependencies: 001_add_organizations_table.sql

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    sku VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, draft, archived
    metadata JSONB DEFAULT '{}',
    search_vector tsvector, -- Full-text search optimization
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID -- References Stack Auth user
);

-- Create indexes for products
CREATE INDEX IF NOT EXISTS idx_products_organization ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(search_vector);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_org ON products(sku, organization_id) WHERE sku IS NOT NULL;

-- Create trigger for search vector updates
DROP TRIGGER IF EXISTS products_search_vector_update ON products;
CREATE TRIGGER products_search_vector_update
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION
    tsvector_update_trigger(search_vector, 'pg_catalog.english', name, description);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add check constraints
ALTER TABLE products
ADD CONSTRAINT check_product_status
CHECK (status IN ('active', 'inactive', 'draft', 'archived'));

-- Insert sample products for the default organization
INSERT INTO products (organization_id, name, description, category, sku, status, metadata)
SELECT
    o.id,
    'Sample Product',
    'This is a sample product for testing the knowledge base system',
    'Electronics',
    'SAMPLE-001',
    'active',
    '{"features": ["sample feature 1", "sample feature 2"], "tags": ["demo", "test"]}'
FROM organizations o WHERE o.slug = 'default'
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE products IS 'Products for organizing documents in knowledge base hierarchy';
COMMENT ON COLUMN products.metadata IS 'JSON metadata including features, tags, specifications, etc.';
COMMENT ON COLUMN products.search_vector IS 'Full-text search vector for product name and description';
COMMENT ON COLUMN products.sku IS 'Stock Keeping Unit - unique within organization';
COMMENT ON COLUMN products.status IS 'Product status: active, inactive, draft, archived';