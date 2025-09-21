import { z } from 'zod';

/**
 * Organization Database Schema
 * Multi-tenant organizations for chatbot management system
 */

// Input interface for organizations (allows optional fields)
export interface IOrganizationData {
  id: string;
  name: string;
  slug: string;
  settings?: Record<string, any>;
  subscription_tier?: 'basic' | 'professional' | 'enterprise';
  created_at: Date;
  updated_at: Date;
}

// Database interface for organizations table
export interface IOrganization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, any>;
  subscription_tier: 'basic' | 'professional' | 'enterprise';
  created_at: Date;
  updated_at: Date;
}

// Input interface for creating organizations
export interface ICreateOrganization {
  name: string;
  slug: string;
  settings?: Record<string, any>;
  subscription_tier?: 'basic' | 'professional' | 'enterprise';
}

// Input interface for updating organizations
export interface IUpdateOrganization {
  name?: string;
  slug?: string;
  settings?: Record<string, any>;
  subscription_tier?: 'basic' | 'professional' | 'enterprise';
}

// Zod schema for validation
export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  settings: z.record(z.string(), z.any()).optional(),
  subscription_tier: z.enum(['basic', 'professional', 'enterprise']).optional(),
  created_at: z.date(),
  updated_at: z.date()
});

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  settings: z.record(z.string(), z.any()).optional(),
  subscription_tier: z.enum(['basic', 'professional', 'enterprise']).optional()
});

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  settings: z.record(z.string(), z.any()).optional(),
  subscription_tier: z.enum(['basic', 'professional', 'enterprise']).optional()
});

// Type exports
export type Organization = z.infer<typeof OrganizationSchema>;
export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>;
export type UpdateOrganization = z.infer<typeof UpdateOrganizationSchema>;

// Organization model class with business logic
export class OrganizationModel {
  private data: IOrganization;

  constructor(data: IOrganizationData) {
    this.data = OrganizationSchema.parse(this.normalizeData(data));
  }

  private normalizeData(data: IOrganizationData): IOrganization {
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      settings: data.settings ?? {},
      subscription_tier: data.subscription_tier ?? 'basic',
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at)
    };
  }

  // Getters
  get id(): string {
    return this.data.id;
  }

  get name(): string {
    return this.data.name;
  }

  get slug(): string {
    return this.data.slug;
  }

  get settings(): Record<string, any> {
    return this.data.settings;
  }

  get subscriptionTier(): 'basic' | 'professional' | 'enterprise' {
    return this.data.subscription_tier;
  }

  get createdAt(): Date {
    return this.data.created_at;
  }

  get updatedAt(): Date {
    return this.data.updated_at;
  }

  // Business logic methods
  isProfessionalTier(): boolean {
    return this.data.subscription_tier === 'professional';
  }

  isEnterpriseTier(): boolean {
    return this.data.subscription_tier === 'enterprise';
  }

  hasFeature(feature: string): boolean {
    const features = this.data.settings.features || [];
    return features.includes(feature);
  }

  canCreateChatbots(): boolean {
    return true; // All tiers can create chatbots
  }

  getMaxChatbots(): number {
    switch (this.data.subscription_tier) {
      case 'basic':
        return 3;
      case 'professional':
        return 10;
      case 'enterprise':
        return -1; // Unlimited
      default:
        return 1;
    }
  }

  getMaxDocuments(): number {
    switch (this.data.subscription_tier) {
      case 'basic':
        return 100;
      case 'professional':
        return 1000;
      case 'enterprise':
        return -1; // Unlimited
      default:
        return 10;
    }
  }

  // Validation methods
  static validateCreate(data: unknown): CreateOrganization {
    return CreateOrganizationSchema.parse(data);
  }

  static validateUpdate(data: unknown): UpdateOrganization {
    return UpdateOrganizationSchema.parse(data);
  }

  // Utility methods
  toJSON(): IOrganization {
    return {
      ...this.data
    };
  }

  toPublicJSON(): Omit<IOrganization, 'settings'> & { features: string[] } {
    return {
      id: this.data.id,
      name: this.data.name,
      slug: this.data.slug,
      subscription_tier: this.data.subscription_tier,
      created_at: this.data.created_at,
      updated_at: this.data.updated_at,
      features: this.data.settings.features || []
    };
  }

  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

// Default organization settings by tier
export const DEFAULT_ORGANIZATION_SETTINGS = {
  basic: {
    theme: 'professional',
    features: ['basic_chatbots', 'document_upload', 'basic_analytics'],
    limits: {
      chatbots: 3,
      documents: 100,
      monthly_messages: 1000
    }
  },
  professional: {
    theme: 'professional',
    features: ['advanced_chatbots', 'bulk_document_upload', 'advanced_analytics', 'integrations'],
    limits: {
      chatbots: 10,
      documents: 1000,
      monthly_messages: 10000
    }
  },
  enterprise: {
    theme: 'professional',
    features: ['enterprise_chatbots', 'unlimited_uploads', 'enterprise_analytics', 'custom_integrations', 'sso'],
    limits: {
      chatbots: -1,
      documents: -1,
      monthly_messages: -1
    }
  }
};

export default OrganizationModel;