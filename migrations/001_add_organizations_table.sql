-- Migration: 001_add_organizations_table.sql
-- Description: Add organizations table for multi-tenant chatbot management
-- Created: 2025-09-20
-- Dependencies: None (Initial table)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for organizations
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for organizations table
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default organization for existing users
INSERT INTO organizations (name, slug, settings, subscription_tier)
VALUES ('Default Organization', 'default', '{"theme": "professional"}', 'basic')
ON CONFLICT (slug) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE organizations IS 'Multi-tenant organizations for chatbot management system';
COMMENT ON COLUMN organizations.settings IS 'JSON configuration including theme preferences, feature flags, etc.';
COMMENT ON COLUMN organizations.subscription_tier IS 'Subscription level: basic, professional, enterprise';