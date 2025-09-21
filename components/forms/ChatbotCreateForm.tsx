'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  CheckCircleIcon,
  InformationCircleIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  BoltIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import {
  type ChatbotModel,
  MODEL_METADATA,
  getPrimaryModels,
  getLegacyModels,
  DEFAULT_MODEL
} from '@/lib/constants/models';

interface ChatbotCreateFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function ChatbotCreateForm({ onSubmit, onCancel }: ChatbotCreateFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    model: DEFAULT_MODEL,
    purpose: 'customer-service',
    integrationTypes: [] as string[]
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedModel = MODEL_METADATA[formData.model];
  const primaryModels = Object.entries(MODEL_METADATA)
    .filter(([_, metadata]) => metadata.isPrimary)
    .map(([id, metadata]) => ({ id: id as ChatbotModel, ...metadata }));
  const legacyModels = Object.entries(MODEL_METADATA)
    .filter(([_, metadata]) => !metadata.isPrimary)
    .map(([id, metadata]) => ({ id: id as ChatbotModel, ...metadata }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const ModelCard = ({ model }: { model: { id: ChatbotModel } & typeof MODEL_METADATA[ChatbotModel] }) => {
    const isSelected = formData.model === model.id;

    return (
      <div
        onClick={() => setFormData(prev => ({ ...prev, model: model.id }))}
        className={`
          relative p-4 rounded-lg border-2 cursor-pointer transition-all
          ${isSelected
            ? model.isPrimary
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-500 bg-gray-50'
            : 'border-gray-200 hover:border-gray-300'
          }
          ${!model.isPrimary ? 'opacity-75' : ''}
        `}
      >
        {model.isRecommended && (
          <div className="absolute -top-2 -right-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
              <StarIcon className="h-3 w-3 mr-1" />
              RECOMMENDED
            </span>
          </div>
        )}

        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              {model.displayName}
              {model.isPrimary && <SparklesIcon className="h-4 w-4 ml-1 text-blue-500" />}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm font-mono text-gray-600">{model.costTier}</span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500">{model.tokensPerDollar} tokens/$</span>
            </div>
          </div>
          {isSelected && (
            <CheckCircleIcon className="h-6 w-6 text-blue-500" />
          )}
        </div>

        <p className="text-sm text-gray-600 mb-3">{model.description}</p>

        <div className="mb-3">
          <div className="text-xs font-medium text-gray-500 mb-1">Best for:</div>
          <div className="text-sm text-gray-700">{model.useCase}</div>
        </div>

        <div className="flex flex-wrap gap-1">
          {model.features.map((feature, index) => (
            <span
              key={index}
              className={`
                text-xs px-2 py-1 rounded-full
                ${model.isPrimary
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
                }
              `}
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Chatbot</h1>
        <p className="text-gray-600 mt-1">Configure your AI chatbot with Amazon Nova's latest models</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chatbot Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Customer Support Assistant"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purpose
              </label>
              <select
                value={formData.purpose}
                onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="customer-service">Customer Service</option>
                <option value="technical-support">Technical Support</option>
                <option value="sales-assistant">Sales Assistant</option>
                <option value="general-assistant">General Assistant</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this chatbot will do..."
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </Card>

        {/* Model Selection */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Choose AI Model</h2>
              <p className="text-sm text-gray-600">Select the best model for your use case</p>
            </div>
            <div className="flex items-center space-x-1 text-sm text-blue-600">
              <SparklesIcon className="h-4 w-4" />
              <span>Amazon Nova - Latest AI Technology</span>
            </div>
          </div>

          {/* Primary Models (Nova) */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <SparklesIcon className="h-4 w-4 mr-1 text-blue-500" />
              Amazon Nova Models (Recommended)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {primaryModels.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          </div>

          {/* Legacy Models */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center mb-3"
            >
              <InformationCircleIcon className="h-4 w-4 mr-1" />
              {showAdvanced ? 'Hide' : 'Show'} Legacy Models
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {legacyModels.map((model) => (
                  <ModelCard key={model.id} model={model} />
                ))}
              </div>
            )}
          </div>

          {/* Selected Model Summary */}
          {selectedModel && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Selected Model: {selectedModel.displayName}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Cost Tier:</span>
                  <div className="font-mono font-medium">{selectedModel.costTier}</div>
                </div>
                <div>
                  <span className="text-gray-500">Efficiency:</span>
                  <div className="font-medium">{selectedModel.tokensPerDollar} tokens/$</div>
                </div>
                <div>
                  <span className="text-gray-500">Best For:</span>
                  <div className="font-medium">{selectedModel.useCase}</div>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>
                  <div className="font-medium">
                    {selectedModel.isPrimary ? 'Latest Nova' : 'Legacy'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!formData.name.trim()}
            className="flex items-center"
          >
            <BoltIcon className="h-4 w-4 mr-2" />
            Create Chatbot with {selectedModel?.displayName}
          </Button>
        </div>
      </form>
    </div>
  );
}