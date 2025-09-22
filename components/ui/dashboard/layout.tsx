'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useUser } from '@/lib/auth/hybrid-auth-provider';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { ChatbotErrorBoundary } from '@/lib/monitoring/sentry-error-boundary';

interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * Main dashboard layout component
 *
 * Provides the core layout structure for the chatbot management dashboard
 * with responsive sidebar, header, and main content area.
 * Requires authentication - redirects to sign-in if user is not authenticated.
 */
export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      router.push('/handler/sign-in');
    }
  }, [user, router]);

  // Show loading state while checking authentication
  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!user) {
    return null;
  }

  return (
    <ChatbotErrorBoundary
      tags={{ component: 'dashboard_layout' }}
      context={{ sidebar_open: sidebarOpen }}
    >
      <div className={cn('min-h-screen bg-background', className)}>
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

        {/* Main content area */}
        <div className="lg:pl-64">
          {/* Header */}
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Main content */}
          <main className="p-6">
            <ChatbotErrorBoundary
              tags={{ component: 'dashboard_main_content' }}
              context={{ path: typeof window !== 'undefined' ? window.location.pathname : '' }}
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
          />
        )}
      </div>
    </ChatbotErrorBoundary>
  );
}

/**
 * Dashboard page wrapper component
 *
 * Provides consistent layout and styling for dashboard pages
 */
interface DashboardPageProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashboardPage({
  title,
  description,
  action,
  children,
  className
}: DashboardPageProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {action && (
          <div className="flex items-center space-x-2">
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
 * Dashboard section component
 *
 * Provides consistent styling for dashboard sections
 */
interface DashboardSectionProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashboardSection({
  title,
  description,
  action,
  children,
  className
}: DashboardSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description || action) && (
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {title && (
              <h2 className="text-lg font-medium">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {action && action}
        </div>
      )}
      {children}
    </div>
  );
}