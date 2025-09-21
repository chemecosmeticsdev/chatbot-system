'use client';

import { Button } from './button';
import { Card } from './card';
import { cn } from '@/lib/utils';
import {
  ChatBubbleLeftRightIcon,
  DocumentIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowPathIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

/**
 * Empty States Components
 *
 * Professional empty state designs with clear CTAs and engaging visuals.
 * Optimized for Thai/English text and accessible design.
 */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
  };
  className?: string;
}

// Base Empty State Component
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-6 text-center',
      className
    )}>
      {icon && (
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <div className="h-10 w-10 text-gray-400">
            {icon}
          </div>
        </div>
      )}

      <h3 className="mb-2 text-lg font-medium text-gray-900">
        {title}
      </h3>

      {description && (
        <p className="mb-6 max-w-sm text-sm text-gray-500 leading-relaxed">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              size="sm"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || 'outline'}
              size="sm"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-configured Empty States for common scenarios

// No Chatbots
export function NoChatbotsEmpty({
  onCreateFirst,
  onLearnMore,
  className
}: {
  onCreateFirst?: () => void;
  onLearnMore?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={<ChatBubbleLeftRightIcon className="h-full w-full" />}
      title="No chatbots created yet"
      description="Create your first AI chatbot to start providing automated customer support and engagement."
      action={onCreateFirst ? {
        label: "Create First Chatbot",
        onClick: onCreateFirst
      } : undefined}
      secondaryAction={onLearnMore ? {
        label: "Learn More",
        onClick: onLearnMore,
        variant: 'ghost'
      } : undefined}
      className={className}
    />
  );
}

// No Documents
export function NoDocumentsEmpty({
  onUploadFirst,
  onBrowseExamples,
  className
}: {
  onUploadFirst?: () => void;
  onBrowseExamples?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={<DocumentIcon className="h-full w-full" />}
      title="No documents uploaded"
      description="Upload documents to build your chatbot's knowledge base. Support for PDFs, text files, and images with OCR."
      action={onUploadFirst ? {
        label: "Upload Documents",
        onClick: onUploadFirst
      } : undefined}
      secondaryAction={onBrowseExamples ? {
        label: "Browse Examples",
        onClick: onBrowseExamples,
        variant: 'outline'
      } : undefined}
      className={className}
    />
  );
}

// No Products
export function NoProductsEmpty({
  onCreateFirst,
  onImportData,
  className
}: {
  onCreateFirst?: () => void;
  onImportData?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={<FolderIcon className="h-full w-full" />}
      title="No products in knowledge base"
      description="Add products to organize your documents and create focused chatbot knowledge scopes."
      action={onCreateFirst ? {
        label: "Add First Product",
        onClick: onCreateFirst
      } : undefined}
      secondaryAction={onImportData ? {
        label: "Import Data",
        onClick: onImportData,
        variant: 'outline'
      } : undefined}
      className={className}
    />
  );
}

// No Search Results
export function NoSearchResultsEmpty({
  searchTerm,
  onClearSearch,
  onTryDifferent,
  className
}: {
  searchTerm?: string;
  onClearSearch?: () => void;
  onTryDifferent?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={<MagnifyingGlassIcon className="h-full w-full" />}
      title={searchTerm ? `No results for "${searchTerm}"` : "No results found"}
      description="Try adjusting your search terms or filters to find what you're looking for."
      action={onClearSearch ? {
        label: "Clear Search",
        onClick: onClearSearch,
        variant: 'outline'
      } : undefined}
      secondaryAction={onTryDifferent ? {
        label: "Browse All",
        onClick: onTryDifferent,
        variant: 'ghost'
      } : undefined}
      className={className}
    />
  );
}

// Error State
export function ErrorState({
  title = "Something went wrong",
  description = "We encountered an error while loading this page. Please try again.",
  onRetry,
  onGoBack,
  className
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={<ExclamationTriangleIcon className="h-full w-full text-red-400" />}
      title={title}
      description={description}
      action={onRetry ? {
        label: "Try Again",
        onClick: onRetry
      } : undefined}
      secondaryAction={onGoBack ? {
        label: "Go Back",
        onClick: onGoBack,
        variant: 'outline'
      } : undefined}
      className={className}
    />
  );
}

// Loading Failed State
export function LoadingFailedEmpty({
  onRetry,
  onRefresh,
  className
}: {
  onRetry?: () => void;
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={<ArrowPathIcon className="h-full w-full" />}
      title="Failed to load data"
      description="We couldn't load the requested information. Check your connection and try again."
      action={onRetry ? {
        label: "Retry",
        onClick: onRetry
      } : undefined}
      secondaryAction={onRefresh ? {
        label: "Refresh Page",
        onClick: onRefresh,
        variant: 'outline'
      } : undefined}
      className={className}
    />
  );
}

// Under Maintenance
export function MaintenanceEmpty({
  onCheckStatus,
  estimatedTime,
  className
}: {
  onCheckStatus?: () => void;
  estimatedTime?: string;
  className?: string;
}) {
  return (
    <EmptyState
      icon={<InformationCircleIcon className="h-full w-full text-blue-400" />}
      title="System Maintenance"
      description={`We're performing scheduled maintenance to improve your experience. ${estimatedTime ? `Estimated completion: ${estimatedTime}` : 'Please check back shortly.'}`}
      action={onCheckStatus ? {
        label: "Check Status",
        onClick: onCheckStatus,
        variant: 'outline'
      } : undefined}
      className={className}
    />
  );
}

// Coming Soon
export function ComingSoonEmpty({
  feature,
  onNotifyMe,
  onLearnMore,
  className
}: {
  feature: string;
  onNotifyMe?: () => void;
  onLearnMore?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={<InformationCircleIcon className="h-full w-full text-purple-400" />}
      title={`${feature} Coming Soon`}
      description="We're working on this feature and will notify you when it's ready."
      action={onNotifyMe ? {
        label: "Notify Me",
        onClick: onNotifyMe
      } : undefined}
      secondaryAction={onLearnMore ? {
        label: "Learn More",
        onClick: onLearnMore,
        variant: 'outline'
      } : undefined}
      className={className}
    />
  );
}

// Filtered Results Empty
export function FilteredResultsEmpty({
  onClearFilters,
  onResetSearch,
  className
}: {
  onClearFilters?: () => void;
  onResetSearch?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={<MagnifyingGlassIcon className="h-full w-full" />}
      title="No items match your filters"
      description="Try adjusting your search criteria or clear filters to see more results."
      action={onClearFilters ? {
        label: "Clear Filters",
        onClick: onClearFilters,
        variant: 'outline'
      } : undefined}
      secondaryAction={onResetSearch ? {
        label: "Show All",
        onClick: onResetSearch,
        variant: 'ghost'
      } : undefined}
      className={className}
    />
  );
}

// Empty State Card (for cards within grid layouts)
export function EmptyStateCard({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn(
      'flex min-h-[300px] items-center justify-center border-dashed border-2 border-gray-200 bg-gray-50/50',
      className
    )}>
      {children}
    </Card>
  );
}

// Comprehensive Empty State Helper
interface EmptyStateConfig {
  type: 'chatbots' | 'documents' | 'products' | 'search' | 'error' | 'maintenance' | 'filtered';
  searchTerm?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  customTitle?: string;
  customDescription?: string;
}

export function SmartEmptyState({
  type,
  searchTerm,
  onPrimaryAction,
  onSecondaryAction,
  primaryLabel,
  secondaryLabel,
  customTitle,
  customDescription,
  className
}: EmptyStateConfig & { className?: string }) {
  const configs = {
    chatbots: () => (
      <NoChatbotsEmpty
        onCreateFirst={onPrimaryAction}
        onLearnMore={onSecondaryAction}
        className={className}
      />
    ),
    documents: () => (
      <NoDocumentsEmpty
        onUploadFirst={onPrimaryAction}
        onBrowseExamples={onSecondaryAction}
        className={className}
      />
    ),
    products: () => (
      <NoProductsEmpty
        onCreateFirst={onPrimaryAction}
        onImportData={onSecondaryAction}
        className={className}
      />
    ),
    search: () => (
      <NoSearchResultsEmpty
        searchTerm={searchTerm}
        onClearSearch={onPrimaryAction}
        onTryDifferent={onSecondaryAction}
        className={className}
      />
    ),
    filtered: () => (
      <FilteredResultsEmpty
        onClearFilters={onPrimaryAction}
        onResetSearch={onSecondaryAction}
        className={className}
      />
    ),
    error: () => (
      <ErrorState
        title={customTitle}
        description={customDescription}
        onRetry={onPrimaryAction}
        onGoBack={onSecondaryAction}
        className={className}
      />
    ),
    maintenance: () => (
      <MaintenanceEmpty
        onCheckStatus={onPrimaryAction}
        className={className}
      />
    ),
  };

  return configs[type]();
}