import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const gridVariants = cva("grid", {
  variants: {
    cols: {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
      6: "grid-cols-6",
      12: "grid-cols-12",
    },
    gap: {
      none: "gap-0",
      xs: "gap-1",
      sm: "gap-2",
      md: "gap-4",
      lg: "gap-6",
      xl: "gap-8",
    },
    responsive: {
      true: "",
      false: "",
    },
  },
  defaultVariants: {
    cols: 1,
    gap: "md",
    responsive: true,
  },
})

export interface ResponsiveGridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {
  breakpoints?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    "2xl"?: number
  }
  minItemWidth?: string
  autoFit?: boolean
  autoFill?: boolean
}

const ResponsiveGrid = React.forwardRef<HTMLDivElement, ResponsiveGridProps>(
  (
    {
      className,
      cols,
      gap,
      responsive,
      breakpoints,
      minItemWidth,
      autoFit,
      autoFill,
      children,
      style,
      ...props
    },
    ref
  ) => {
    // Build responsive classes
    const responsiveClasses = React.useMemo(() => {
      if (!responsive || !breakpoints) return ""

      const classes: string[] = []

      if (breakpoints.xs) classes.push(`grid-cols-${breakpoints.xs}`)
      if (breakpoints.sm) classes.push(`sm:grid-cols-${breakpoints.sm}`)
      if (breakpoints.md) classes.push(`md:grid-cols-${breakpoints.md}`)
      if (breakpoints.lg) classes.push(`lg:grid-cols-${breakpoints.lg}`)
      if (breakpoints.xl) classes.push(`xl:grid-cols-${breakpoints.xl}`)
      if (breakpoints["2xl"]) classes.push(`2xl:grid-cols-${breakpoints["2xl"]}`)

      return classes.join(" ")
    }, [responsive, breakpoints])

    // CSS Grid auto-fit/auto-fill styles
    const gridStyle = React.useMemo(() => {
      if (minItemWidth && (autoFit || autoFill)) {
        const repeatFunction = autoFit ? "auto-fit" : "auto-fill"
        return {
          gridTemplateColumns: `repeat(${repeatFunction}, minmax(${minItemWidth}, 1fr))`,
          ...style,
        }
      }
      return style
    }, [minItemWidth, autoFit, autoFill, style])

    const gridClasses = cn(
      gridVariants({ cols: responsive ? undefined : cols, gap }),
      responsiveClasses,
      className
    )

    return (
      <div
        ref={ref}
        className={gridClasses}
        style={gridStyle}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ResponsiveGrid.displayName = "ResponsiveGrid"

// Grid item component for layout control
const gridItemVariants = cva("", {
  variants: {
    colSpan: {
      1: "col-span-1",
      2: "col-span-2",
      3: "col-span-3",
      4: "col-span-4",
      5: "col-span-5",
      6: "col-span-6",
      7: "col-span-7",
      8: "col-span-8",
      9: "col-span-9",
      10: "col-span-10",
      11: "col-span-11",
      12: "col-span-12",
      full: "col-span-full",
    },
    rowSpan: {
      1: "row-span-1",
      2: "row-span-2",
      3: "row-span-3",
      4: "row-span-4",
      5: "row-span-5",
      6: "row-span-6",
      full: "row-span-full",
    },
    colStart: {
      1: "col-start-1",
      2: "col-start-2",
      3: "col-start-3",
      4: "col-start-4",
      5: "col-start-5",
      6: "col-start-6",
      7: "col-start-7",
      8: "col-start-8",
      9: "col-start-9",
      10: "col-start-10",
      11: "col-start-11",
      12: "col-start-12",
      13: "col-start-13",
      auto: "col-start-auto",
    },
    rowStart: {
      1: "row-start-1",
      2: "row-start-2",
      3: "row-start-3",
      4: "row-start-4",
      5: "row-start-5",
      6: "row-start-6",
      7: "row-start-7",
      auto: "row-start-auto",
    },
  },
})

export interface GridItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridItemVariants> {
  responsiveSpan?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    "2xl"?: number
  }
}

const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  ({ className, colSpan, rowSpan, colStart, rowStart, responsiveSpan, children, ...props }, ref) => {
    // Build responsive span classes
    const responsiveClasses = React.useMemo(() => {
      if (!responsiveSpan) return ""

      const classes: string[] = []

      if (responsiveSpan.xs) classes.push(`col-span-${responsiveSpan.xs}`)
      if (responsiveSpan.sm) classes.push(`sm:col-span-${responsiveSpan.sm}`)
      if (responsiveSpan.md) classes.push(`md:col-span-${responsiveSpan.md}`)
      if (responsiveSpan.lg) classes.push(`lg:col-span-${responsiveSpan.lg}`)
      if (responsiveSpan.xl) classes.push(`xl:col-span-${responsiveSpan.xl}`)
      if (responsiveSpan["2xl"]) classes.push(`2xl:col-span-${responsiveSpan["2xl"]}`)

      return classes.join(" ")
    }, [responsiveSpan])

    return (
      <div
        ref={ref}
        className={cn(
          gridItemVariants({ colSpan, rowSpan, colStart, rowStart }),
          responsiveClasses,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
GridItem.displayName = "GridItem"

// Masonry-style grid component
export interface MasonryGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: number
  gap?: string
  responsive?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    "2xl"?: number
  }
}

const MasonryGrid = React.forwardRef<HTMLDivElement, MasonryGridProps>(
  ({ className, columns = 3, gap = "1rem", responsive, children, ...props }, ref) => {
    const masonryStyle: React.CSSProperties = {
      columnCount: columns,
      columnGap: gap,
      columnFill: "balance",
    }

    // Add responsive styles via CSS custom properties
    const responsiveStyle = React.useMemo(() => {
      if (!responsive) return masonryStyle

      const style = { ...masonryStyle }

      // This would need CSS custom properties or media queries to work properly
      // For now, we'll use the base column count
      return style
    }, [masonryStyle, responsive])

    return (
      <div
        ref={ref}
        className={cn("masonry-grid", className)}
        style={responsiveStyle}
        {...props}
      >
        {React.Children.map(children, (child, index) => (
          <div
            key={index}
            className="break-inside-avoid mb-4"
            style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
          >
            {child}
          </div>
        ))}
      </div>
    )
  }
)
MasonryGrid.displayName = "MasonryGrid"

// Container component for consistent max-width and padding
const containerVariants = cva("mx-auto w-full", {
  variants: {
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
      xs: "px-2",
      sm: "px-4",
      md: "px-6",
      lg: "px-8",
      xl: "px-12",
    },
  },
  defaultVariants: {
    size: "xl",
    padding: "md",
  },
})

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(containerVariants({ size, padding, className }))}
      {...props}
    />
  )
)
Container.displayName = "Container"

export { ResponsiveGrid, GridItem, MasonryGrid, Container, gridVariants, gridItemVariants, containerVariants }