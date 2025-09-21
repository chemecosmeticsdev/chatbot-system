'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ExclamationTriangleIcon,
  ArrowRightIcon,
  XMarkIcon,
  SparklesIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import {
  type ChatbotModel,
  type LegacyModel,
  getMigrationSuggestion,
  getCostSavings,
  getModelDisplayName,
  getModelCostTier,
} from '@/lib/constants/models';

interface ModelMigrationBannerProps {
  currentModel: LegacyModel;
  onMigrate?: (newModel: ChatbotModel) => void;
  onDismiss?: () => void;
  className?: string;
}

export default function ModelMigrationBanner({
  currentModel,
  onMigrate,
  onDismiss,
  className = ''
}: ModelMigrationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const suggestedModel = getMigrationSuggestion(currentModel);
  const costSavings = getCostSavings(currentModel, suggestedModel);
  const currentDisplayName = getModelDisplayName(currentModel);
  const suggestedDisplayName = getModelDisplayName(suggestedModel);
  const currentCostTier = getModelCostTier(currentModel);
  const suggestedCostTier = getModelCostTier(suggestedModel);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleMigrate = () => {
    onMigrate?.(suggestedModel);
  };

  return (
    <Card className={`border-orange-200 bg-orange-50 ${className}`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
          </div>

          <div className="ml-3 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-orange-800">
                Migration Recommended
              </h3>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 ml-4 text-orange-600 hover:text-orange-800"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 text-sm text-orange-700">
              <p className="mb-3">
                Your chatbot is using a legacy model. Migrate to Amazon Nova for better performance and cost savings.
              </p>

              {/* Migration Comparison */}
              <div className="bg-white rounded-lg p-3 border border-orange-200">
                <div className="flex items-center justify-between">
                  {/* Current Model */}
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Current</div>
                    <div className="font-medium text-gray-900">{currentDisplayName}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Cost: <span className="font-mono">{currentCostTier}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="mx-4 flex flex-col items-center">
                    <ArrowRightIcon className="h-4 w-4 text-green-600" />
                    <div className="text-xs text-green-600 font-medium mt-1">
                      {costSavings}
                    </div>
                  </div>

                  {/* Suggested Model */}
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Recommended</div>
                    <div className="font-medium text-green-700 flex items-center">
                      <SparklesIcon className="h-3 w-3 mr-1" />
                      {suggestedDisplayName}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Cost: <span className="font-mono">{suggestedCostTier}</span>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div className="mt-3 pt-3 border-t border-orange-100">
                  <div className="text-xs text-gray-600 mb-2">Migration Benefits:</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                      <CurrencyDollarIcon className="h-3 w-3 mr-1" />
                      Lower Cost
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                      <SparklesIcon className="h-3 w-3 mr-1" />
                      Latest Technology
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                      Better Performance
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center space-x-3">
              {onMigrate && (
                <Button
                  size="sm"
                  onClick={handleMigrate}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <SparklesIcon className="h-4 w-4 mr-1" />
                  Migrate to {suggestedDisplayName}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-orange-700 hover:text-orange-800"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}