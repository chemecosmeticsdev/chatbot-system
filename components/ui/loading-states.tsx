'use client';

import { Skeleton } from './skeleton';
import { Card, CardContent, CardHeader } from './card';
import { cn } from '@/lib/utils';

/**
 * Loading States Components
 *
 * Professional loading components with skeleton screens for different UI patterns.
 * Optimized for Thai/English text and responsive design.
 */

// Dashboard Cards Loading
export function DashboardCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('p-6', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-3 w-[80px]" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[90%]" />
        <div className="flex justify-between pt-2">
          <Skeleton className="h-6 w-[60px]" />
          <Skeleton className="h-6 w-[60px]" />
        </div>
      </CardContent>
    </Card>
  );
}

// Chatbot Card Loading (for chatbot management page)
export function ChatbotCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-[140px]" />
            <Skeleton className="h-3 w-[80px]" />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-6 w-[70px] rounded-full" />
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[85%]" />
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-[50px]" />
          <Skeleton className="h-3 w-[80px]" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-3 w-[70px]" />
          <Skeleton className="h-3 w-[60px]" />
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-16 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </Card>
  );
}

// Data Table Loading
export function DataTableSkeleton({
  rows = 5,
  columns = 4,
  className
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Table Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Grid Layout Loading (for overview pages)
export function GridSkeleton({
  items = 6,
  columns = 3,
  className
}: {
  items?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn(
      'grid gap-6',
      columns === 2 && 'md:grid-cols-2',
      columns === 3 && 'md:grid-cols-2 lg:grid-cols-3',
      columns === 4 && 'md:grid-cols-2 lg:grid-cols-4',
      className
    )}>
      {Array.from({ length: items }).map((_, i) => (
        <DashboardCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Stats Grid Loading (for metrics overview)
export function StatsGridSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-4', className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-[60px]" />
            <Skeleton className="h-3 w-[80px]" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// Form Loading
export function FormSkeleton({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-2">
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </div>

      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}

      <div className="flex justify-end space-x-2 pt-4">
        <Skeleton className="h-10 w-[80px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>
    </div>
  );
}

// Page Header Loading
export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <Skeleton className="h-10 w-[120px]" />
      </div>
    </div>
  );
}

// Search and Filters Loading
export function SearchFiltersSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4', className)}>
      <Skeleton className="h-10 flex-1" />
      <div className="flex space-x-2">
        <Skeleton className="h-10 w-[120px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>
    </div>
  );
}

// Sidebar Loading
export function SidebarSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4 p-4', className)}>
      {/* Logo area */}
      <div className="flex items-center space-x-2 pb-4">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-6 w-[140px]" />
      </div>

      {/* Navigation items */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-[100px]" />
        </div>
      ))}
    </div>
  );
}

// Content with Loading State wrapper
interface LoadingWrapperProps {
  loading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function LoadingWrapper({ loading, children, fallback, className }: LoadingWrapperProps) {
  if (loading) {
    return (
      <div className={cn('animate-pulse', className)}>
        {fallback || <GridSkeleton />}
      </div>
    );
  }

  return <>{children}</>;
}

// Centralized loading component for different page types
interface PageLoadingProps {
  type: 'dashboard' | 'chatbots' | 'table' | 'form' | 'details';
  className?: string;
}

export function PageLoading({ type, className }: PageLoadingProps) {
  const components = {
    dashboard: (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <StatsGridSkeleton />
        <GridSkeleton items={6} columns={3} />
      </div>
    ),
    chatbots: (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <StatsGridSkeleton />
        <SearchFiltersSkeleton />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ChatbotCardSkeleton key={i} />
          ))}
        </div>
      </div>
    ),
    table: (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <SearchFiltersSkeleton />
        <DataTableSkeleton rows={8} columns={5} />
      </div>
    ),
    form: (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <FormSkeleton fields={6} />
      </div>
    ),
    details: (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <FormSkeleton fields={4} />
          </div>
          <div>
            <DashboardCardSkeleton />
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className={cn('space-y-6', className)}>
      {components[type]}
    </div>
  );
}