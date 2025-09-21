'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Enhanced Typography System
 *
 * Optimized typography components with Thai language support.
 * Features proper line-height, letter-spacing, and font weights
 * for both Thai and English content.
 */

// Typography variants with Thai optimization
const typographyVariants = cva(
  'transition-colors',
  {
    variants: {
      variant: {
        // Headings - optimized for both languages
        h1: 'scroll-m-20 text-4xl font-bold tracking-tight lg:text-5xl',
        h2: 'scroll-m-20 text-3xl font-semibold tracking-tight',
        h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
        h4: 'scroll-m-20 text-xl font-semibold tracking-tight',
        h5: 'scroll-m-20 text-lg font-semibold tracking-tight',
        h6: 'scroll-m-20 text-base font-semibold tracking-tight',

        // Body text - Thai optimized
        'body-large': 'text-lg leading-relaxed',
        'body': 'text-base leading-relaxed',
        'body-small': 'text-sm leading-relaxed',

        // UI text
        'caption': 'text-xs leading-normal font-medium',
        'overline': 'text-xs uppercase tracking-wider font-medium',
        'label': 'text-sm font-medium leading-normal',

        // Special variants
        'lead': 'text-xl text-muted-foreground leading-relaxed',
        'muted': 'text-sm text-muted-foreground leading-relaxed',
        'code': 'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
      },
      language: {
        en: 'font-inter tracking-normal',
        th: 'font-thai tracking-wide',
        auto: '', // Auto-detect based on content
      },
      color: {
        default: 'text-foreground',
        muted: 'text-muted-foreground',
        primary: 'text-primary',
        secondary: 'text-secondary-foreground',
        destructive: 'text-destructive',
        success: 'text-green-600',
        warning: 'text-yellow-600',
        info: 'text-blue-600',
      },
      align: {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
        justify: 'text-justify',
      },
      weight: {
        light: 'font-light',
        normal: 'font-normal',
        medium: 'font-medium',
        semibold: 'font-semibold',
        bold: 'font-bold',
      },
    },
    defaultVariants: {
      variant: 'body',
      language: 'auto',
      color: 'default',
      align: 'left',
      weight: 'normal',
    },
  }
);

// Language detection helper
function detectLanguage(text: string): 'th' | 'en' | 'mixed' {
  if (!text) return 'en';

  // Thai Unicode range: \u0E00-\u0E7F
  const thaiChars = text.match(/[\u0E00-\u0E7F]/g);
  const totalChars = text.replace(/\s/g, '').length;

  if (!thaiChars) return 'en';

  const thaiRatio = thaiChars.length / totalChars;

  if (thaiRatio > 0.7) return 'th';
  if (thaiRatio > 0.3) return 'mixed';
  return 'en';
}

// Get appropriate CSS classes for detected language
function getLanguageClasses(text: string, language?: 'en' | 'th' | 'auto'): string {
  if (language && language !== 'auto') {
    return language === 'th'
      ? 'font-thai leading-loose tracking-wide'
      : 'font-inter leading-normal tracking-normal';
  }

  const detected = detectLanguage(text);

  switch (detected) {
    case 'th':
      return 'font-thai leading-loose tracking-wide text-thai-optimized';
    case 'mixed':
      return 'font-inter leading-relaxed tracking-normal mixed-lang';
    default:
      return 'font-inter leading-normal tracking-normal';
  }
}

// Main Typography component
export interface TypographyProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
    VariantProps<typeof typographyVariants> {
  as?: React.ElementType;
  children: React.ReactNode;
  truncate?: boolean;
  language?: 'en' | 'th' | 'auto';
}

export function Typography({
  className,
  variant,
  language = 'auto',
  color,
  align,
  weight,
  as,
  children,
  truncate,
  ...props
}: TypographyProps) {
  const Component = as || getDefaultElement(variant);
  const textContent = typeof children === 'string' ? children : '';
  const languageClasses = getLanguageClasses(textContent, language);

  return (
    <Component
      className={cn(
        typographyVariants({ variant, language, color, align, weight }),
        languageClasses,
        truncate && 'truncate',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

// Helper to get default HTML element for variant
function getDefaultElement(variant?: string | null): React.ElementType {
  switch (variant) {
    case 'h1': return 'h1';
    case 'h2': return 'h2';
    case 'h3': return 'h3';
    case 'h4': return 'h4';
    case 'h5': return 'h5';
    case 'h6': return 'h6';
    case 'lead': return 'p';
    case 'code': return 'code';
    case 'label': return 'label';
    case 'caption': return 'span';
    case 'overline': return 'span';
    default: return 'p';
  }
}

// Specialized components for common use cases

// Page Title - auto-adjusts for Thai content
export function PageTitle({
  children,
  className,
  ...props
}: Omit<TypographyProps, 'variant'>) {
  return (
    <Typography
      variant="h1"
      className={cn('mb-6', className)}
      {...props}
    >
      {children}
    </Typography>
  );
}

// Section Heading
export function SectionHeading({
  children,
  className,
  ...props
}: Omit<TypographyProps, 'variant'>) {
  return (
    <Typography
      variant="h2"
      className={cn('mb-4', className)}
      {...props}
    >
      {children}
    </Typography>
  );
}

// Card Title
export function CardTitle({
  children,
  className,
  ...props
}: Omit<TypographyProps, 'variant'>) {
  return (
    <Typography
      variant="h3"
      className={cn('mb-2', className)}
      {...props}
    >
      {children}
    </Typography>
  );
}

// Description text - optimized for readability
export function Description({
  children,
  className,
  ...props
}: Omit<TypographyProps, 'variant'>) {
  return (
    <Typography
      variant="body"
      color="muted"
      className={cn('leading-relaxed', className)}
      {...props}
    >
      {children}
    </Typography>
  );
}

// Form Label
export function FormLabel({
  children,
  className,
  required,
  ...props
}: Omit<TypographyProps, 'variant'> & { required?: boolean }) {
  return (
    <Typography
      variant="label"
      as="label"
      className={cn('block mb-2', className)}
      {...props}
    >
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </Typography>
  );
}

// Error text
export function ErrorText({
  children,
  className,
  ...props
}: Omit<TypographyProps, 'variant' | 'color'>) {
  return (
    <Typography
      variant="body-small"
      color="destructive"
      className={cn('mt-1', className)}
      {...props}
    >
      {children}
    </Typography>
  );
}

// Helper text
export function HelperText({
  children,
  className,
  ...props
}: Omit<TypographyProps, 'variant' | 'color'>) {
  return (
    <Typography
      variant="body-small"
      color="muted"
      className={cn('mt-1', className)}
      {...props}
    >
      {children}
    </Typography>
  );
}

// Code block with syntax highlighting support
export function CodeBlock({
  children,
  language,
  className,
  ...props
}: {
  children: string;
  language?: string;
  className?: string;
} & React.HTMLAttributes<HTMLPreElement>) {
  return (
    <pre
      className={cn(
        'relative rounded-lg bg-muted p-4 overflow-x-auto',
        'border border-border',
        'font-mono text-sm',
        className
      )}
      {...props}
    >
      <code className="relative font-mono text-sm">
        {children}
      </code>
    </pre>
  );
}

// Inline code
export function InlineCode({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <code
      className={cn(
        'relative rounded bg-muted px-[0.3rem] py-[0.2rem]',
        'font-mono text-sm font-medium',
        'border border-border/50',
        className
      )}
      {...props}
    >
      {children}
    </code>
  );
}

// Blockquote
export function Blockquote({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLQuoteElement>) {
  return (
    <blockquote
      className={cn(
        'mt-6 border-l-4 border-primary pl-6 italic',
        'text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  );
}

// List components
export function List({
  children,
  ordered = false,
  className,
  ...props
}: {
  children: React.ReactNode;
  ordered?: boolean;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  const Component = ordered ? 'ol' : 'ul';

  return (
    <Component
      className={cn(
        'my-6 ml-6 list-disc space-y-2',
        ordered && 'list-decimal',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

// Text with highlight
export function HighlightText({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <mark
      className={cn(
        'bg-yellow-100 px-1 py-0.5 rounded',
        'text-yellow-900',
        className
      )}
      {...props}
    >
      {children}
    </mark>
  );
}

// Badge text
export function BadgeText({
  children,
  variant = 'default',
  className,
  ...props
}: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    destructive: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// Export variant functions for external use
export { typographyVariants, detectLanguage, getLanguageClasses };