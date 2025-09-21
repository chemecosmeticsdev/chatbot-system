'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Accessibility Enhancement Components
 *
 * WCAG 2.1 AA compliant components and utilities for improved accessibility.
 * Includes screen reader support, keyboard navigation, and focus management.
 */

// Skip Link Component for keyboard navigation
interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'absolute left-[-10000px] top-auto w-[1px] h-[1px] overflow-hidden',
        'focus:left-6 focus:top-6 focus:w-auto focus:h-auto focus:overflow-visible',
        'bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'z-50 transition-all duration-200',
        className
      )}
    >
      {children}
    </a>
  );
}

// Screen Reader Only Text
interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
}

export function ScreenReaderOnly({
  children,
  as: Component = 'span',
  className
}: ScreenReaderOnlyProps) {
  return (
    <Component
      className={cn(
        'absolute w-[1px] h-[1px] p-0 -m-[1px] overflow-hidden',
        'whitespace-nowrap border-0 clip-path-[inset(50%)]',
        className
      )}
    >
      {children}
    </Component>
  );
}

// Live Region for Screen Reader Announcements
interface LiveRegionProps {
  children: React.ReactNode;
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  className?: string;
}

export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = false,
  relevant = 'additions',
  className
}: LiveRegionProps) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn('sr-only', className)}
    >
      {children}
    </div>
  );
}

// Focus Trap Component
interface FocusTrapProps {
  children: React.ReactNode;
  enabled?: boolean;
  className?: string;
}

export function FocusTrap({ children, enabled = true, className }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstElementRef = useRef<HTMLElement | null>(null);
  const lastElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements
    const getFocusableElements = () => {
      const selectors = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable]'
      ].join(', ');

      return Array.from(container.querySelectorAll(selectors)) as HTMLElement[];
    };

    const updateFocusableElements = () => {
      const elements = getFocusableElements();
      firstElementRef.current = elements[0] || null;
      lastElementRef.current = elements[elements.length - 1] || null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      updateFocusableElements();

      if (!firstElementRef.current || !lastElementRef.current) return;

      if (e.shiftKey) {
        // Shift + Tab (moving backwards)
        if (document.activeElement === firstElementRef.current) {
          e.preventDefault();
          lastElementRef.current.focus();
        }
      } else {
        // Tab (moving forwards)
        if (document.activeElement === lastElementRef.current) {
          e.preventDefault();
          firstElementRef.current.focus();
        }
      }
    };

    // Focus first element when trap is enabled
    updateFocusableElements();
    if (firstElementRef.current) {
      firstElementRef.current.focus();
    }

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

// High Contrast Mode Detector
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsHighContrast(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isHighContrast;
}

// Reduced Motion Detector
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// Accessible Button with proper ARIA support
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function AccessibleButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText = 'Loading...',
  disabled,
  children,
  className,
  ...props
}: AccessibleButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-describedby={loading ? `${props.id}-loading` : undefined}
      className={cn(
        // Base styles
        'inline-flex items-center justify-center rounded-md font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',

        // Size variants
        size === 'sm' && 'h-9 px-3 text-sm',
        size === 'md' && 'h-10 px-4 py-2',
        size === 'lg' && 'h-11 px-8 text-base',

        // Color variants
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        variant === 'danger' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',

        // Loading state
        loading && 'cursor-wait',

        className
      )}
    >
      {loading && (
        <>
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <ScreenReaderOnly>
            {loadingText}
          </ScreenReaderOnly>
        </>
      )}
      {children}
    </button>
  );
}

// Accessible Form Field with proper labeling
interface AccessibleFieldProps {
  label: string;
  id: string;
  required?: boolean;
  error?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function AccessibleField({
  label,
  id,
  required = false,
  error,
  description,
  children,
  className
}: AccessibleFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={id}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {description && (
        <p
          id={descriptionId}
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}

      {React.cloneElement(children as React.ReactElement, {
        id,
        'aria-describedby': [descriptionId, errorId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? 'true' : undefined,
        'aria-required': required,
      })}

      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// Accessible Tooltip with proper ARIA
interface AccessibleTooltipProps {
  content: string;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function AccessibleTooltip({
  content,
  children,
  delay = 300,
  className
}: AccessibleTooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [timeoutId, setTimeoutId] = React.useState<NodeJS.Timeout | null>(null);
  const tooltipId = React.useId();

  const showTooltip = () => {
    if (timeoutId) clearTimeout(timeoutId);
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsVisible(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  return (
    <div className="relative inline-block">
      {React.cloneElement(children as React.ReactElement, {
        'aria-describedby': isVisible ? tooltipId : undefined,
        onMouseEnter: showTooltip,
        onMouseLeave: hideTooltip,
        onFocus: showTooltip,
        onBlur: hideTooltip,
      })}

      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={cn(
            'absolute z-50 px-3 py-1.5 text-sm text-white bg-gray-900 rounded-md',
            'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
            'pointer-events-none',
            className
          )}
        >
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

// Accessible Modal with proper focus management
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className
}: AccessibleModalProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <FocusTrap
        className={cn(
          'relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4',
          'max-h-[90vh] overflow-y-auto',
          className
        )}
      >
        <div className="p-6">
          <h2 id={titleId} className="text-lg font-semibold mb-2">
            {title}
          </h2>

          {description && (
            <p id={descriptionId} className="text-sm text-gray-600 mb-4">
              {description}
            </p>
          )}

          {children}
        </div>
      </FocusTrap>
    </div>
  );
}

// Keyboard Navigation Helper
export function useKeyboardNavigation(
  itemCount: number,
  onSelect: (index: number) => void,
  options: {
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical';
  } = {}
) {
  const { loop = true, orientation = 'vertical' } = options;
  const [activeIndex, setActiveIndex] = React.useState(0);

  const handleKeyDown = React.useCallback((e: KeyboardEvent) => {
    const isVertical = orientation === 'vertical';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

    switch (e.key) {
      case nextKey:
        e.preventDefault();
        setActiveIndex(current => {
          const next = current + 1;
          return next >= itemCount ? (loop ? 0 : current) : next;
        });
        break;

      case prevKey:
        e.preventDefault();
        setActiveIndex(current => {
          const prev = current - 1;
          return prev < 0 ? (loop ? itemCount - 1 : current) : prev;
        });
        break;

      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;

      case 'End':
        e.preventDefault();
        setActiveIndex(itemCount - 1);
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(activeIndex);
        break;
    }
  }, [itemCount, onSelect, loop, orientation, activeIndex]);

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
  };
}