'use client';

import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { EnhancedSidebar } from './sidebar-enhanced';
import { EnhancedHeader } from './header-enhanced';
import { ChatbotErrorBoundary } from '@/lib/monitoring/sentry-error-boundary';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { PageLoading } from '@/components/ui/loading-states';
import { ErrorState } from '@/components/ui/empty-states';
import { Typography, PageTitle, SectionHeading, Description } from '@/components/ui/typography-enhanced';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * Enhanced Dashboard Layout Component
 *
 * Modern responsive layout with improved navigation, loading states,
 * error boundaries, and Thai/English typography support.
 */
export function EnhancedDashboardLayout({ children, className }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <TooltipProvider>
      <ChatbotErrorBoundary
        tags={{ component: 'dashboard_layout' }}
        context={{ sidebar_open: sidebarOpen }}
        fallback={() => (
          <div className="min-h-screen flex items-center justify-center p-6">
            <ErrorState
              title="Dashboard Error"
              description="Something went wrong loading the dashboard. Please refresh the page."
              onRetry={() => window.location.reload()}
            />
          </div>
        )}
      >
        <div className={cn('min-h-screen bg-gray-50/30', className)}>
          {/* Sidebar */}
          <EnhancedSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

          {/* Main content area */}
          <div className="lg:pl-72">
            {/* Header */}
            <EnhancedHeader onMenuClick={() => setSidebarOpen(true)} />

            {/* Main content */}
            <main className="p-6 max-w-full">
              <ChatbotErrorBoundary
                tags={{ component: 'dashboard_main_content' }}
                context={{ path: typeof window !== 'undefined' ? window.location.pathname : '' }}
                fallback={() => (
                  <ErrorState
                    title="Content Error"
                    description="Failed to load page content. Please try again."
                    onRetry={() => window.location.reload()}
                  />
                )}
              >
                {children}
              </ChatbotErrorBoundary>
            </main>
          </div>

          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black bg-opacity-25 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Global toast notifications */}
        <Toaster
          position="top-right"
          richColors
          closeButton
          expand
          visibleToasts={5}
        />
      </ChatbotErrorBoundary>
    </TooltipProvider>
  );
}

/**
 * Enhanced Dashboard Page Wrapper
 *
 * Provides consistent layout and styling for dashboard pages with
 * improved typography and responsive design.
 */
interface DashboardPageProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  loading?: boolean;
  loadingType?: 'dashboard' | 'chatbots' | 'table' | 'form' | 'details';
  breadcrumbs?: Array<{
    name: string;
    href?: string;
    current?: boolean;
  }>;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
}

export function EnhancedDashboardPage({
  title,
  description,
  action,
  children,
  className,
  loading = false,
  loadingType = 'dashboard',
  breadcrumbs,
  badge
}: DashboardPageProps) {
  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <PageLoading type={loadingType} />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            {breadcrumbs.map((item, index) => (
              <li key={item.name} className="flex items-center">
                {index > 0 && (
                  <svg
                    className="mx-2 h-4 w-4 text-gray-300"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {item.href && !item.current ? (
                  <a
                    href={item.href}
                    className="font-medium hover:text-gray-700 transition-colors"
                  >
                    {item.name}
                  </a>
                ) : (
                  <span
                    className={cn(
                      'font-medium',
                      item.current && 'text-gray-900'
                    )}
                  >
                    {item.name}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Page header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <PageTitle className="mb-0">{title}</PageTitle>
            {badge && (
              <Badge variant={badge.variant} className="text-xs">
                {badge.text}
              </Badge>
            )}
          </div>
          {description && (
            <Description className="mb-0 max-w-2xl">
              {description}
            </Description>
          )}
        </div>
        {action && (
          <div className="flex items-center space-x-2 shrink-0">
            {action}
          </div>
        )}
      </div>

      {/* Page content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}

/**
 * Enhanced Dashboard Section
 *
 * Provides consistent styling for dashboard sections with improved typography
 */
interface DashboardSectionProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'card' | 'bordered';
}

export function EnhancedDashboardSection({
  title,
  description,
  action,
  children,
  className,
  variant = 'default'
}: DashboardSectionProps) {
  const content = (
    <>
      {(title || description || action) && (
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="space-y-1 min-w-0">
            {title && (
              <SectionHeading className="mb-1">{title}</SectionHeading>
            )}
            {description && (
              <Description className="mb-0">{description}</Description>
            )}
          </div>
          {action && (
            <div className="shrink-0">
              {action}
            </div>
          )}
        </div>
      )}
      {children}
    </>
  );

  if (variant === 'card') {
    return (
      <div className={cn(
        'rounded-lg border border-gray-200 bg-white p-6 shadow-sm',
        className
      )}>
        {content}
      </div>
    );
  }

  if (variant === 'bordered') {
    return (
      <div className={cn('space-y-4', className)}>
        {(title || description || action) && (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                {title && (
                  <SectionHeading className="mb-1">{title}</SectionHeading>
                )}
                {description && (
                  <Description className="mb-0">{description}</Description>
                )}
              </div>
              {action && (
                <div className="shrink-0">
                  {action}
                </div>
              )}
            </div>
            <Separator />
          </>
        )}
        {children}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {content}
    </div>
  );
}

/**
 * Dashboard Stats Grid
 *
 * Responsive grid for displaying key metrics
 */
interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: ReactNode;
  className?: string;
}

export function StatsCard({
  title,
  value,
  description,
  trend,
  icon,
  className
}: StatsCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={cn(
      'rounded-lg border border-gray-200 bg-white p-6 shadow-sm',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Typography variant="body-small" color="muted" className="font-medium">
            {title}
          </Typography>
          <Typography variant="h2" className="font-bold">
            {formatValue(value)}
          </Typography>
          {description && (
            <Typography variant="body-small" color="muted">
              {description}
            </Typography>
          )}
          {trend && (
            <div className="flex items-center gap-1">
              <Typography
                variant="body-small"
                className={cn('font-medium', getTrendColor(trend.direction))}
              >
                {trend.direction === 'up' && '+'}
                {trend.value}%
              </Typography>
              <Typography variant="body-small" color="muted">
                {trend.label}
              </Typography>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

interface StatsGridProps {
  stats: Array<Omit<StatsCardProps, 'className'>>;
  className?: string;
}

export function StatsGrid({ stats, className }: StatsGridProps) {
  return (
    <div className={cn(
      'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4',
      className
    )}>
      {stats.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  );
}