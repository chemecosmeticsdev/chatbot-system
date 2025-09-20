import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, isThaiText } from "@/lib/utils"

const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
      h2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0",
      h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
      h4: "scroll-m-20 text-xl font-semibold tracking-tight",
      h5: "scroll-m-20 text-lg font-semibold tracking-tight",
      h6: "scroll-m-20 text-base font-semibold tracking-tight",
      p: "leading-7 [&:not(:first-child)]:mt-6",
      blockquote: "mt-6 border-l-2 pl-6 italic",
      ul: "my-6 ml-6 list-disc [&>li]:mt-2",
      ol: "my-6 ml-6 list-decimal [&>li]:mt-2",
      code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
      lead: "text-xl text-muted-foreground",
      large: "text-lg font-semibold",
      small: "text-sm font-medium leading-none",
      muted: "text-sm text-muted-foreground",
      caption: "text-xs text-muted-foreground",
    },
    language: {
      auto: "",
      thai: "thai-text",
      english: "english-text",
    },
    responsive: {
      true: "responsive-text",
      false: "",
    },
  },
  defaultVariants: {
    variant: "p",
    language: "auto",
    responsive: false,
  },
})

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: keyof JSX.IntrinsicElements
  children: React.ReactNode
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, language, responsive, as, children, ...props }, ref) => {
    // Auto-detect language if set to auto
    const detectedLanguage = React.useMemo(() => {
      if (language !== "auto") return language
      if (typeof children === "string") {
        return isThaiText(children) ? "thai" : "english"
      }
      return "english"
    }, [language, children])

    // Determine the HTML element to render
    const Component = as || getDefaultElement(variant)

    return React.createElement(
      Component,
      {
        ref,
        className: cn(
          typographyVariants({
            variant,
            language: detectedLanguage,
            responsive,
            className,
          })
        ),
        ...props,
      },
      children
    )
  }
)

Typography.displayName = "Typography"

// Helper function to get default HTML element for each variant
function getDefaultElement(variant: string | null | undefined): keyof JSX.IntrinsicElements {
  switch (variant) {
    case "h1":
      return "h1"
    case "h2":
      return "h2"
    case "h3":
      return "h3"
    case "h4":
      return "h4"
    case "h5":
      return "h5"
    case "h6":
      return "h6"
    case "blockquote":
      return "blockquote"
    case "ul":
      return "ul"
    case "ol":
      return "ol"
    case "code":
      return "code"
    default:
      return "p"
  }
}

// Convenience components for common use cases
const H1 = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, "variant">>(
  (props, ref) => <Typography ref={ref} variant="h1" as="h1" {...props} />
)
H1.displayName = "H1"

const H2 = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, "variant">>(
  (props, ref) => <Typography ref={ref} variant="h2" as="h2" {...props} />
)
H2.displayName = "H2"

const H3 = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, "variant">>(
  (props, ref) => <Typography ref={ref} variant="h3" as="h3" {...props} />
)
H3.displayName = "H3"

const H4 = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, "variant">>(
  (props, ref) => <Typography ref={ref} variant="h4" as="h4" {...props} />
)
H4.displayName = "H4"

const P = React.forwardRef<HTMLParagraphElement, Omit<TypographyProps, "variant">>(
  (props, ref) => <Typography ref={ref} variant="p" as="p" {...props} />
)
P.displayName = "P"

const Lead = React.forwardRef<HTMLParagraphElement, Omit<TypographyProps, "variant">>(
  (props, ref) => <Typography ref={ref} variant="lead" as="p" {...props} />
)
Lead.displayName = "Lead"

const Large = React.forwardRef<HTMLDivElement, Omit<TypographyProps, "variant">>(
  (props, ref) => <Typography ref={ref} variant="large" as="div" {...props} />
)
Large.displayName = "Large"

const Small = React.forwardRef<HTMLElement, Omit<TypographyProps, "variant">>(
  (props, ref) => <Typography ref={ref} variant="small" as="small" {...props} />
)
Small.displayName = "Small"

const Muted = React.forwardRef<HTMLParagraphElement, Omit<TypographyProps, "variant">>(
  (props, ref) => <Typography ref={ref} variant="muted" as="p" {...props} />
)
Muted.displayName = "Muted"

const Code = React.forwardRef<HTMLElement, Omit<TypographyProps, "variant">>(
  (props, ref) => <Typography ref={ref} variant="code" as="code" {...props} />
)
Code.displayName = "Code"

const Blockquote = React.forwardRef<HTMLQuoteElement, Omit<TypographyProps, "variant">>(
  (props, ref) => <Typography ref={ref} variant="blockquote" as="blockquote" {...props} />
)
Blockquote.displayName = "Blockquote"

// Multilingual text component with auto-detection
interface MultilingualTextProps extends Omit<TypographyProps, "language"> {
  forceLanguage?: "thai" | "english"
}

const MultilingualText = React.forwardRef<HTMLElement, MultilingualTextProps>(
  ({ forceLanguage, children, ...props }, ref) => {
    const language = forceLanguage || "auto"

    return (
      <Typography ref={ref} language={language} {...props}>
        {children}
      </Typography>
    )
  }
)
MultilingualText.displayName = "MultilingualText"

export {
  Typography,
  typographyVariants,
  H1,
  H2,
  H3,
  H4,
  P,
  Lead,
  Large,
  Small,
  Muted,
  Code,
  Blockquote,
  MultilingualText,
}