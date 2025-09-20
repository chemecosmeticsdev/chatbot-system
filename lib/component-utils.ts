import { type VariantProps, cva } from "class-variance-authority"
import { cn } from "./utils"

/**
 * Create component variants with CVA
 */
export function createVariants<T extends Record<string, Record<string, string>>>(
  base: string,
  variants: T,
  defaultVariants?: Partial<{
    [K in keyof T]: keyof T[K]
  }>
) {
  return cva(base, {
    variants,
    defaultVariants,
  })
}

/**
 * Component size variants
 */
export const sizeVariants = {
  xs: "h-6 px-2 text-xs",
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  xl: "h-14 px-8 text-lg",
}

/**
 * Common button variants
 */
export const buttonVariants = createVariants(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline",
    },
    size: sizeVariants,
  },
  {
    variant: "default",
    size: "md",
  }
)

/**
 * Input variants
 */
export const inputVariants = createVariants(
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variant: {
      default: "",
      destructive: "border-destructive focus-visible:ring-destructive",
      success: "border-success focus-visible:ring-success",
    },
    size: {
      sm: "h-8 px-2 text-xs",
      md: "h-10 px-3 py-2 text-sm",
      lg: "h-12 px-4 py-3 text-base",
    },
  },
  {
    variant: "default",
    size: "md",
  }
)

/**
 * Card variants
 */
export const cardVariants = createVariants(
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variant: {
      default: "",
      elevated: "shadow-md hover:shadow-lg transition-shadow",
      interactive: "cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
      ghost: "border-0 shadow-none",
    },
    padding: {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    },
  },
  {
    variant: "default",
    padding: "md",
  }
)

/**
 * Badge variants
 */
export const badgeVariants = createVariants(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variant: {
      default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
      secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
      destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
      outline: "text-foreground",
      success: "border-transparent bg-success text-success-foreground hover:bg-success/80",
      warning: "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
      info: "border-transparent bg-info text-info-foreground hover:bg-info/80",
    },
  },
  {
    variant: "default",
  }
)

/**
 * Avatar variants
 */
export const avatarVariants = createVariants(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    size: {
      xs: "h-6 w-6",
      sm: "h-8 w-8",
      md: "h-10 w-10",
      lg: "h-12 w-12",
      xl: "h-16 w-16",
      "2xl": "h-20 w-20",
    },
  },
  {
    size: "md",
  }
)

/**
 * Skeleton variants
 */
export const skeletonVariants = createVariants(
  "animate-pulse rounded-md bg-muted",
  {
    variant: {
      default: "",
      circular: "rounded-full",
      text: "h-4",
      title: "h-6",
      avatar: "rounded-full",
    },
  },
  {
    variant: "default",
  }
)

/**
 * Loading spinner variants
 */
export const spinnerVariants = createVariants(
  "animate-spin rounded-full border-2 border-current border-t-transparent",
  {
    size: {
      xs: "h-3 w-3",
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8",
      xl: "h-12 w-12",
    },
  },
  {
    size: "md",
  }
)

/**
 * Alert variants
 */
export const alertVariants = createVariants(
  "relative w-full rounded-lg border p-4",
  {
    variant: {
      default: "bg-background text-foreground",
      destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      success: "border-success/50 text-success dark:border-success [&>svg]:text-success",
      warning: "border-warning/50 text-warning dark:border-warning [&>svg]:text-warning",
      info: "border-info/50 text-info dark:border-info [&>svg]:text-info",
    },
  },
  {
    variant: "default",
  }
)

/**
 * Progress variants
 */
export const progressVariants = createVariants(
  "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
  {
    size: {
      xs: "h-1",
      sm: "h-2",
      md: "h-4",
      lg: "h-6",
    },
  },
  {
    size: "md",
  }
)

/**
 * Responsive container variants
 */
export const containerVariants = createVariants(
  "mx-auto w-full",
  {
    size: {
      sm: "max-w-screen-sm",
      md: "max-w-screen-md",
      lg: "max-w-screen-lg",
      xl: "max-w-screen-xl",
      "2xl": "max-w-screen-2xl",
      full: "max-w-full",
    },
    padding: {
      none: "",
      sm: "px-4",
      md: "px-6",
      lg: "px-8",
    },
  },
  {
    size: "xl",
    padding: "md",
  }
)

/**
 * Typography variants
 */
export const typographyVariants = createVariants(
  "",
  {
    variant: {
      h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
      h2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
      h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
      h4: "scroll-m-20 text-xl font-semibold tracking-tight",
      p: "leading-7 [&:not(:first-child)]:mt-6",
      blockquote: "mt-6 border-l-2 pl-6 italic",
      code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
      lead: "text-xl text-muted-foreground",
      large: "text-lg font-semibold",
      small: "text-sm font-medium leading-none",
      muted: "text-sm text-muted-foreground",
    },
  }
)

/**
 * Utility for creating compound components
 */
export function createCompoundComponent<T extends Record<string, any>>(
  components: T
): T & {
  displayName?: string
} {
  return components
}

/**
 * Utility for creating forwarded ref components
 */
export function createForwardRefComponent<T, P = {}>(
  render: (props: P, ref: React.Ref<T>) => React.ReactNode,
  displayName?: string
) {
  const component = React.forwardRef<T, P>(render)
  if (displayName) {
    component.displayName = displayName
  }
  return component
}

/**
 * Utility for merging refs
 */
export function mergeRefs<T = any>(
  ...refs: Array<React.MutableRefObject<T> | React.LegacyRef<T>>
): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value)
      } else if (ref != null) {
        ;(ref as React.MutableRefObject<T | null>).current = value
      }
    })
  }
}

/**
 * Utility for component composition
 */
export function composeEventHandlers<E>(
  originalEventHandler?: (event: E) => void,
  ourEventHandler?: (event: E) => void,
  { checkForDefaultPrevented = true } = {}
) {
  return function handleEvent(event: E) {
    originalEventHandler?.(event)

    if (
      checkForDefaultPrevented === false ||
      !(event as any).defaultPrevented
    ) {
      return ourEventHandler?.(event)
    }
  }
}

/**
 * Utility for slot composition (similar to Radix Slot)
 */
export interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean
}

export function Slot({
  asChild,
  children,
  ...props
}: SlotProps): React.ReactElement {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...mergeProps(props, children.props),
    })
  }

  return <div {...props}>{children}</div>
}

function mergeProps(
  slotProps: Record<string, any>,
  childProps: Record<string, any>
) {
  const overrideProps = { ...childProps }

  for (const propName in childProps) {
    const slotPropValue = slotProps[propName]
    const childPropValue = childProps[propName]

    const isHandler = /^on[A-Z]/.test(propName)

    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args: unknown[]) => {
          childPropValue(...args)
          slotPropValue(...args)
        }
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue }
    } else if (propName === "className") {
      overrideProps[propName] = cn(slotPropValue, childPropValue)
    }
  }

  return { ...slotProps, ...overrideProps }
}

/**
 * Responsive utility types
 */
export type ResponsiveValue<T> = T | {
  xs?: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
  '2xl'?: T
}

/**
 * Get responsive class for breakpoints
 */
export function getResponsiveClass<T extends string>(
  value: ResponsiveValue<T>,
  classMap: Record<T, string>
): string {
  if (typeof value === 'string') {
    return classMap[value] || ''
  }

  const classes: string[] = []
  const breakpoints = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const

  breakpoints.forEach((breakpoint) => {
    const breakpointValue = value[breakpoint]
    if (breakpointValue && classMap[breakpointValue]) {
      const prefix = breakpoint === 'xs' ? '' : `${breakpoint}:`
      classes.push(`${prefix}${classMap[breakpointValue]}`)
    }
  })

  return classes.join(' ')
}

/**
 * Animation utilities
 */
export const animationPresets = {
  fadeIn: "animate-fade-in",
  fadeOut: "animate-fade-out",
  slideIn: "animate-slide-in",
  slideOut: "animate-slide-out",
  scaleIn: "animate-scale-in",
  scaleOut: "animate-scale-out",
  bounceIn: "animate-bounce-in",
  shimmer: "animate-shimmer",
  pulse: "animate-pulse-subtle",
} as const

/**
 * Get animation class with optional delay
 */
export function getAnimationClass(
  animation: keyof typeof animationPresets,
  delay?: number
): string {
  const baseClass = animationPresets[animation]
  if (delay) {
    return `${baseClass} [animation-delay:${delay}ms]`
  }
  return baseClass
}

export type ComponentVariantProps<T> = T extends (props: any) => any
  ? VariantProps<T>
  : never

export { type VariantProps } from "class-variance-authority"