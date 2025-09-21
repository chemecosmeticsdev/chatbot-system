'use client';

import { Badge } from './badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { Progress } from './progress';
import { cn } from '@/lib/utils';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

/**
 * Status Indicators Components
 *
 * Professional status displays with clear visual hierarchy and accessibility.
 * Includes tooltips and supports Thai/English content.
 */

// Base Status Badge
interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  showIcon?: boolean;
  tooltip?: string;
  className?: string;
}

export function StatusBadge({
  status,
  variant = 'default',
  showIcon = true,
  tooltip,
  className
}: StatusBadgeProps) {
  const icons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon,
    neutral: ClockIcon,
    default: ClockIcon,
  };

  const Icon = icons[variant];

  const badgeContent = (
    <Badge
      variant={variant === 'success' ? 'default' : variant === 'error' ? 'destructive' : 'secondary'}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium',
        variant === 'success' && 'bg-green-100 text-green-800 hover:bg-green-200',
        variant === 'warning' && 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
        variant === 'error' && 'bg-red-100 text-red-800 hover:bg-red-200',
        variant === 'info' && 'bg-blue-100 text-blue-800 hover:bg-blue-200',
        variant === 'neutral' && 'bg-gray-100 text-gray-800 hover:bg-gray-200',
        className
      )}
    >
      {showIcon && Icon && <Icon className="h-3 w-3" />}
      <span className="capitalize">{status}</span>
    </Badge>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
}

// Chatbot Status
export function ChatbotStatus({
  status,
  deploymentStatus,
  className
}: {
  status: 'active' | 'inactive' | 'training' | 'error' | 'paused';
  deploymentStatus?: 'deployed' | 'pending' | 'failed' | 'deploying';
  className?: string;
}) {
  const statusConfig = {
    active: { variant: 'success' as const, tooltip: 'Chatbot is running and responding to queries' },
    inactive: { variant: 'neutral' as const, tooltip: 'Chatbot is stopped and not responding' },
    training: { variant: 'warning' as const, tooltip: 'Chatbot is being trained or updated' },
    error: { variant: 'error' as const, tooltip: 'Chatbot encountered an error and needs attention' },
    paused: { variant: 'neutral' as const, tooltip: 'Chatbot is temporarily paused' },
  };

  const deploymentConfig = {
    deployed: { variant: 'success' as const, tooltip: 'Successfully deployed to production' },
    pending: { variant: 'warning' as const, tooltip: 'Deployment is in progress' },
    failed: { variant: 'error' as const, tooltip: 'Deployment failed - check logs for details' },
    deploying: { variant: 'warning' as const, tooltip: 'Currently deploying changes' },
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <StatusBadge
        status={status}
        variant={statusConfig[status].variant}
        tooltip={statusConfig[status].tooltip}
      />
      {deploymentStatus && (
        <StatusBadge
          status={deploymentStatus}
          variant={deploymentConfig[deploymentStatus].variant}
          tooltip={deploymentConfig[deploymentStatus].tooltip}
          showIcon={false}
        />
      )}
    </div>
  );
}

// Processing Status with Progress
export function ProcessingStatus({
  stage,
  progress,
  totalSteps,
  currentStep,
  error,
  className
}: {
  stage: string;
  progress?: number;
  totalSteps?: number;
  currentStep?: number;
  error?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {error ? (
            <XCircleIcon className="h-4 w-4 text-red-500" />
          ) : (
            <ArrowPathIcon className="h-4 w-4 text-blue-500 animate-spin" />
          )}
          <span className="text-sm font-medium">
            {error ? 'Error' : stage}
          </span>
        </div>
        {totalSteps && currentStep && (
          <span className="text-xs text-gray-500">
            {currentStep} of {totalSteps}
          </span>
        )}
      </div>

      {progress !== undefined && (
        <Progress value={progress} className="h-2" />
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

// Health Status
export function HealthStatus({
  status,
  uptime,
  lastChecked,
  className
}: {
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  uptime?: string;
  lastChecked?: Date;
  className?: string;
}) {
  const statusConfig = {
    healthy: {
      variant: 'success' as const,
      icon: CheckCircleIcon,
      color: 'text-green-500',
      label: 'Operational'
    },
    degraded: {
      variant: 'warning' as const,
      icon: ExclamationTriangleIcon,
      color: 'text-yellow-500',
      label: 'Degraded'
    },
    down: {
      variant: 'error' as const,
      icon: XCircleIcon,
      color: 'text-red-500',
      label: 'Down'
    },
    unknown: {
      variant: 'neutral' as const,
      icon: InformationCircleIcon,
      color: 'text-gray-500',
      label: 'Unknown'
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-2">
        <Icon className={cn('h-5 w-5', config.color)} />
        <span className="font-medium">{config.label}</span>
      </div>

      <div className="text-sm text-gray-500">
        {uptime && (
          <span>Uptime: {uptime}</span>
        )}
        {uptime && lastChecked && <span className="mx-2">•</span>}
        {lastChecked && (
          <span>
            Last checked: {lastChecked.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}

// Connection Status
export function ConnectionStatus({
  connected,
  latency,
  signal,
  className
}: {
  connected: boolean;
  latency?: number;
  signal?: 'excellent' | 'good' | 'fair' | 'poor';
  className?: string;
}) {
  const signalConfig = {
    excellent: { bars: 4, color: 'text-green-500' },
    good: { bars: 3, color: 'text-green-500' },
    fair: { bars: 2, color: 'text-yellow-500' },
    poor: { bars: 1, color: 'text-red-500' },
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-2">
        <div className={cn(
          'h-2 w-2 rounded-full',
          connected ? 'bg-green-500' : 'bg-red-500'
        )} />
        <span className="text-sm font-medium">
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {connected && latency && (
        <span className="text-xs text-gray-500">
          {latency}ms
        </span>
      )}

      {connected && signal && (
        <div className={cn('flex items-center gap-0.5', signalConfig[signal].color)}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-1 bg-current',
                i === 0 && 'h-1',
                i === 1 && 'h-2',
                i === 2 && 'h-3',
                i === 3 && 'h-4',
                i >= signalConfig[signal].bars && 'opacity-30'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Usage Status
export function UsageStatus({
  used,
  total,
  unit,
  warning = 80,
  critical = 95,
  className
}: {
  used: number;
  total: number;
  unit: string;
  warning?: number;
  critical?: number;
  className?: string;
}) {
  const percentage = (used / total) * 100;

  const getVariant = () => {
    if (percentage >= critical) return 'error';
    if (percentage >= warning) return 'warning';
    return 'success';
  };

  const getColor = () => {
    if (percentage >= critical) return 'text-red-600';
    if (percentage >= warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Usage</span>
        <span className={cn('text-sm font-medium', getColor())}>
          {used.toLocaleString()} / {total.toLocaleString()} {unit}
        </span>
      </div>

      <Progress
        value={percentage}
        className={cn(
          'h-2',
          percentage >= critical && '[&>div]:bg-red-500',
          percentage >= warning && percentage < critical && '[&>div]:bg-yellow-500'
        )}
      />

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{percentage.toFixed(1)}% used</span>
        <span>{(total - used).toLocaleString()} {unit} remaining</span>
      </div>
    </div>
  );
}

// Model Status (for AI models)
export function ModelStatus({
  model,
  status,
  accuracy,
  lastTrained,
  className
}: {
  model: string;
  status: 'ready' | 'training' | 'error' | 'updating';
  accuracy?: number;
  lastTrained?: Date;
  className?: string;
}) {
  const statusConfig = {
    ready: { variant: 'success' as const, icon: CheckCircleIcon },
    training: { variant: 'warning' as const, icon: ArrowPathIcon },
    error: { variant: 'error' as const, icon: XCircleIcon },
    updating: { variant: 'warning' as const, icon: ArrowPathIcon },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn(
            'h-4 w-4',
            status === 'training' && 'animate-spin',
            status === 'updating' && 'animate-spin'
          )} />
          <span className="font-medium">{model}</span>
        </div>
        <StatusBadge
          status={status}
          variant={config.variant}
          showIcon={false}
        />
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        {accuracy && (
          <span>Accuracy: {accuracy}%</span>
        )}
        {lastTrained && (
          <span>
            Trained: {lastTrained.toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

// Smart Status Component (auto-detects type)
interface SmartStatusProps {
  type: 'chatbot' | 'health' | 'connection' | 'usage' | 'model' | 'processing';
  data: any;
  className?: string;
}

export function SmartStatus({ type, data, className }: SmartStatusProps) {
  const components = {
    chatbot: <ChatbotStatus {...data} className={className} />,
    health: <HealthStatus {...data} className={className} />,
    connection: <ConnectionStatus {...data} className={className} />,
    usage: <UsageStatus {...data} className={className} />,
    model: <ModelStatus {...data} className={className} />,
    processing: <ProcessingStatus {...data} className={className} />,
  };

  return components[type];
}