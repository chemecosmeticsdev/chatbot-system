/**
 * UI Components Export Index
 *
 * This file exports all UI components for easy importing throughout the application.
 * Import components like: import { Button, Badge, Skeleton } from '@/components/ui'
 */

// Core UI Components
export { Button, buttonVariants } from './button'
export { Card, CardHeader, CardDescription, CardContent, CardFooter } from './card'
// CardTitle is exported from enhanced typography below
export { Input } from './input'
// Typography is exported from enhanced typography below
export { ResponsiveGrid } from './responsive-grid'
export { ThemeProvider } from './theme-provider'

// Enhanced UI Components
export { Badge, badgeVariants } from './badge'
export { Skeleton } from './skeleton'
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
export { Toaster } from './sonner'
// toast is not exported from sonner component
export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from './dropdown-menu'
export { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './sheet'
export { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './table'
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
export { Progress } from './progress'
export { Separator } from './separator'
export { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './dialog'
export { Avatar, AvatarFallback, AvatarImage } from './avatar'
export { ScrollArea } from './scroll-area'

// Enhanced Loading States
export {
  DashboardCardSkeleton,
  ChatbotCardSkeleton,
  DataTableSkeleton,
  GridSkeleton,
  StatsGridSkeleton,
  FormSkeleton,
  PageHeaderSkeleton,
  SearchFiltersSkeleton,
  SidebarSkeleton,
  LoadingWrapper,
  PageLoading
} from './loading-states'

// Empty States
export {
  EmptyState,
  NoChatbotsEmpty,
  NoDocumentsEmpty,
  NoProductsEmpty,
  NoSearchResultsEmpty,
  ErrorState,
  LoadingFailedEmpty,
  MaintenanceEmpty,
  ComingSoonEmpty,
  FilteredResultsEmpty,
  EmptyStateCard,
  SmartEmptyState
} from './empty-states'

// Status Indicators
export {
  StatusBadge,
  ChatbotStatus,
  ProcessingStatus,
  HealthStatus,
  ConnectionStatus,
  UsageStatus,
  ModelStatus,
  SmartStatus
} from './status-indicators'

// Enhanced Typography
export {
  Typography,
  PageTitle,
  SectionHeading,
  CardTitle,
  Description,
  FormLabel,
  ErrorText,
  HelperText,
  CodeBlock,
  InlineCode,
  Blockquote,
  List,
  HighlightText,
  BadgeText,
  typographyVariants,
  detectLanguage,
  getLanguageClasses
} from './typography-enhanced'

// Language Switching Components
export {
  LanguageSwitcher,
  LanguageToggle,
  LanguageIndicator,
  useLanguage,
  languageSwitcherVariants,
  type LanguageSwitcherProps,
  type LanguageOption
} from './language-switcher'

// Dashboard Components (dashboard module doesn't exist, use specific exports)

// Re-export component types for convenience
export type { ButtonProps } from './button'