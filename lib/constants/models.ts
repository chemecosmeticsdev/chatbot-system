/**
 * Shared model constants and utilities for Amazon Nova and legacy models
 * Used across chatbot management UI components for consistency
 */

// Amazon Nova model types
export type NovaModel =
  | 'amazon.nova-micro-v1:0'
  | 'amazon.nova-lite-v1:0'
  | 'amazon.nova-pro-v1:0';

// Legacy model types (maintained for backward compatibility)
export type LegacyModel =
  | 'claude-3-haiku'
  | 'claude-3-sonnet'
  | 'gpt-4o-mini'
  | 'gpt-4o';

export type ChatbotModel = NovaModel | LegacyModel;

// Model metadata for display and descriptions
export interface ModelMetadata {
  displayName: string;
  description: string;
  costTier: '$' | '$$' | '$$$';
  badgeColor: string;
  isRecommended?: boolean;
  isPrimary?: boolean;
  tokensPerDollar: string;
  useCase: string;
  features: string[];
}

export const MODEL_METADATA: Record<ChatbotModel, ModelMetadata> = {
  // Amazon Nova models (primary options)
  'amazon.nova-micro-v1:0': {
    displayName: 'Nova Micro',
    description: 'Ultra-fast, cost-effective model for high-volume interactions',
    costTier: '$',
    badgeColor: 'bg-green-100 text-green-800 border-green-200',
    isRecommended: true,
    isPrimary: true,
    tokensPerDollar: '28,571',
    useCase: 'Customer Support, FAQ, Simple Queries',
    features: ['Ultra-low latency', 'High throughput', 'Cost optimized', 'Fast responses']
  },
  'amazon.nova-lite-v1:0': {
    displayName: 'Nova Lite',
    description: 'Balanced performance and cost for general-purpose chatbots',
    costTier: '$$',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    isPrimary: true,
    tokensPerDollar: '5,000',
    useCase: 'Technical Support, Sales, General Assistant',
    features: ['Balanced performance', 'Good reasoning', 'Multilingual support', 'Versatile']
  },
  'amazon.nova-pro-v1:0': {
    displayName: 'Nova Pro',
    description: 'Advanced reasoning capabilities for complex conversations',
    costTier: '$$$',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    isPrimary: true,
    tokensPerDollar: '1,250',
    useCase: 'Complex Analysis, Advanced Reasoning, Research',
    features: ['Advanced reasoning', 'Complex problem solving', 'Detailed analysis', 'Premium quality']
  },
  // Legacy models (maintained for backward compatibility)
  'claude-3-haiku': {
    displayName: 'Claude 3 Haiku',
    description: 'Legacy: Fast responses with good comprehension',
    costTier: '$$',
    badgeColor: 'bg-gray-100 text-gray-600 border-gray-200',
    tokensPerDollar: '4,000',
    useCase: 'Legacy Support',
    features: ['Legacy model', 'Migration recommended', 'Higher cost', 'Limited features']
  },
  'claude-3-sonnet': {
    displayName: 'Claude 3 Sonnet',
    description: 'Legacy: Balanced performance and reasoning',
    costTier: '$$$',
    badgeColor: 'bg-gray-100 text-gray-600 border-gray-200',
    tokensPerDollar: '667',
    useCase: 'Legacy Support',
    features: ['Legacy model', 'Migration recommended', 'Higher cost', 'Limited features']
  },
  'gpt-4o-mini': {
    displayName: 'GPT-4o Mini',
    description: 'Legacy: Compact version with good performance',
    costTier: '$$',
    badgeColor: 'bg-gray-100 text-gray-600 border-gray-200',
    tokensPerDollar: '2,000',
    useCase: 'Legacy Support',
    features: ['Legacy model', 'Migration recommended', 'Higher cost', 'Limited features']
  },
  'gpt-4o': {
    displayName: 'GPT-4o',
    description: 'Legacy: Full-featured model with comprehensive capabilities',
    costTier: '$$$',
    badgeColor: 'bg-gray-100 text-gray-600 border-gray-200',
    tokensPerDollar: '667',
    useCase: 'Legacy Support',
    features: ['Legacy model', 'Migration recommended', 'Higher cost', 'Limited features']
  }
};

// Helper functions for consistent model handling
export const getModelDisplayName = (model: ChatbotModel): string => {
  return MODEL_METADATA[model]?.displayName || model;
};

export const getModelBadgeColor = (model: ChatbotModel): string => {
  return MODEL_METADATA[model]?.badgeColor || 'bg-gray-100 text-gray-800';
};

export const getModelCostTier = (model: ChatbotModel): string => {
  return MODEL_METADATA[model]?.costTier || '$$';
};

export const isRecommendedModel = (model: ChatbotModel): boolean => {
  return MODEL_METADATA[model]?.isRecommended || false;
};

export const isPrimaryModel = (model: ChatbotModel): boolean => {
  return MODEL_METADATA[model]?.isPrimary || false;
};

export const getModelDescription = (model: ChatbotModel): string => {
  return MODEL_METADATA[model]?.description || '';
};

// Model groupings for UI display
export const getPrimaryModels = (): ModelMetadata[] => {
  return Object.entries(MODEL_METADATA)
    .filter(([_, metadata]) => metadata.isPrimary)
    .map(([model, metadata]) => ({ ...metadata, id: model as ChatbotModel })) as any;
};

export const getLegacyModels = (): ModelMetadata[] => {
  return Object.entries(MODEL_METADATA)
    .filter(([_, metadata]) => !metadata.isPrimary)
    .map(([model, metadata]) => ({ ...metadata, id: model as ChatbotModel })) as any;
};

// Default model for new chatbots
export const DEFAULT_MODEL: ChatbotModel = 'amazon.nova-micro-v1:0';

// Model selection options for dropdowns
export const MODEL_OPTIONS = [
  {
    group: 'Amazon Nova (Recommended)',
    options: [
      { value: 'amazon.nova-micro-v1:0', label: 'Nova Micro ($ - Ultra Fast)', isRecommended: true },
      { value: 'amazon.nova-lite-v1:0', label: 'Nova Lite ($$ - Balanced)' },
      { value: 'amazon.nova-pro-v1:0', label: 'Nova Pro ($$$ - Advanced)' }
    ]
  },
  {
    group: 'Legacy Models',
    options: [
      { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
      { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4o', label: 'GPT-4o' }
    ]
  }
];

// Migration suggestions for legacy models
export const getMigrationSuggestion = (legacyModel: LegacyModel): NovaModel => {
  const suggestions: Record<LegacyModel, NovaModel> = {
    'claude-3-haiku': 'amazon.nova-micro-v1:0',
    'gpt-4o-mini': 'amazon.nova-lite-v1:0',
    'claude-3-sonnet': 'amazon.nova-lite-v1:0',
    'gpt-4o': 'amazon.nova-pro-v1:0'
  };

  return suggestions[legacyModel] || 'amazon.nova-micro-v1:0';
};

// Cost comparison utilities
export const getCostSavings = (fromModel: LegacyModel, toModel: NovaModel): string => {
  const fromTokens = parseInt(MODEL_METADATA[fromModel].tokensPerDollar.replace(',', ''));
  const toTokens = parseInt(MODEL_METADATA[toModel].tokensPerDollar.replace(',', ''));

  if (toTokens > fromTokens) {
    const savings = Math.round(((toTokens - fromTokens) / fromTokens) * 100);
    return `${savings}% cost savings`;
  }

  return 'Compare costs';
};

export default {
  MODEL_METADATA,
  getModelDisplayName,
  getModelBadgeColor,
  getModelCostTier,
  isRecommendedModel,
  isPrimaryModel,
  getModelDescription,
  getPrimaryModels,
  getLegacyModels,
  DEFAULT_MODEL,
  MODEL_OPTIONS,
  getMigrationSuggestion,
  getCostSavings
};