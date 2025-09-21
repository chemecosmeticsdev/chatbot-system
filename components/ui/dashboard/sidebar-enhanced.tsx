'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { cn } from '@/lib/utils';
import {
  HomeIcon,
  FolderIcon,
  DocumentIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  CogIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  BeakerIcon,
  UsersIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Enhanced navigation items with grouping and metadata
const navigationGroups = [
  {
    name: 'Dashboard',
    items: [
      {
        name: 'Overview',
        href: '/dashboard',
        icon: HomeIcon,
        description: 'Dashboard overview and metrics',
        count: null,
        badge: null,
      },
    ],
  },
  {
    name: 'Knowledge Base',
    items: [
      {
        name: 'Products',
        href: '/dashboard/products',
        icon: FolderIcon,
        description: 'Manage knowledge base products',
        count: 12,
        badge: null,
      },
      {
        name: 'Documents',
        href: '/dashboard/documents',
        icon: DocumentIcon,
        description: 'Upload and process documents',
        count: 45,
        badge: { text: '3 processing', variant: 'secondary' as const },
      },
    ],
  },
  {
    name: 'Chatbots',
    items: [
      {
        name: 'Chatbots',
        href: '/dashboard/chatbots',
        icon: ChatBubbleLeftRightIcon,
        description: 'Create and manage chatbot instances',
        count: 5,
        badge: { text: '2 active', variant: 'default' as const },
      },
      {
        name: 'Conversations',
        href: '/dashboard/conversations',
        icon: UsersIcon,
        description: 'View conversation history',
        count: 1247,
        badge: { text: '24 today', variant: 'outline' as const },
      },
      {
        name: 'Playground',
        href: '/dashboard/playground',
        icon: BeakerIcon,
        description: 'Test chatbot conversations',
        count: null,
        badge: null,
      },
    ],
  },
  {
    name: 'Analytics',
    items: [
      {
        name: 'Analytics',
        href: '/dashboard/analytics',
        icon: ChartBarIcon,
        description: 'Performance and usage analytics',
        count: null,
        badge: null,
      },
      {
        name: 'Vector Search',
        href: '/dashboard/search',
        icon: MagnifyingGlassIcon,
        description: 'Test vector search functionality',
        count: null,
        badge: null,
      },
    ],
  },
  {
    name: 'Settings',
    items: [
      {
        name: 'Settings',
        href: '/dashboard/settings',
        icon: CogIcon,
        description: 'System configuration',
        count: null,
        badge: null,
      },
    ],
  },
];

/**
 * Enhanced Sidebar navigation component
 *
 * Modern responsive navigation with grouping, badges, tooltips,
 * and improved accessibility. Thai/English internationalization ready.
 */
export function EnhancedSidebar({ open, onOpenChange }: SidebarProps) {
  const pathname = usePathname();

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900">
              ChatBot Manager
            </span>
            <span className="text-xs text-gray-500">
              AI Management Platform
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4 py-4">
        <nav className="space-y-6">
          {navigationGroups.map((group) => (
            <div key={group.name}>
              {/* Group Label */}
              <div className="px-3 mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {group.name}
                </h3>
              </div>

              {/* Group Items */}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  return (
                    <li key={item.name}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.href}
                              className={cn(
                                'group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                                'hover:bg-gray-50 hover:text-gray-900',
                                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                                isActive
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'text-gray-700'
                              )}
                              onClick={() => {
                                // Close mobile sidebar when navigating
                                if (open) onOpenChange(false);
                              }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <item.icon
                                  className={cn(
                                    'h-5 w-5 shrink-0 transition-colors',
                                    isActive
                                      ? 'text-primary-foreground'
                                      : 'text-gray-400 group-hover:text-gray-500'
                                  )}
                                  aria-hidden="true"
                                />
                                <span className="truncate">{item.name}</span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* Count */}
                                {item.count !== null && (
                                  <span className={cn(
                                    'text-xs font-medium',
                                    isActive ? 'text-primary-foreground/80' : 'text-gray-500'
                                  )}>
                                    {item.count.toLocaleString()}
                                  </span>
                                )}

                                {/* Badge */}
                                {item.badge && (
                                  <Badge
                                    variant={item.badge.variant}
                                    className="text-xs px-2 py-0"
                                  >
                                    {item.badge.text}
                                  </Badge>
                                )}
                              </div>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="hidden lg:block">
                            <div className="space-y-1">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-gray-500">{item.description}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-gray-100 p-4">
        <div className="rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-4">
          <div className="text-sm">
            <div className="font-medium text-gray-900 mb-1">Multi-Language Support</div>
            <div className="text-xs text-gray-600 mb-3">
              Optimized for Thai/English markets with advanced AI capabilities
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-xs">
                  🇺🇸
                </div>
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-xs">
                  🇹🇭
                </div>
              </div>
              <span className="text-xs text-gray-500">2 Languages</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={onOpenChange}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:text-white hover:bg-white/10"
                      onClick={() => onOpenChange(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </Button>
                  </div>
                </Transition.Child>
                <SidebarContent />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <SidebarContent />
      </div>
    </>
  );
}

/**
 * Collapsed Sidebar for space-saving layout
 */
interface CollapsedSidebarProps {
  onExpand: () => void;
}

export function CollapsedSidebar({ onExpand }: CollapsedSidebarProps) {
  const pathname = usePathname();

  // Get main navigation items (without grouping for collapsed view)
  const mainItems = navigationGroups.flatMap(group =>
    group.items.filter(item =>
      ['/dashboard', '/dashboard/chatbots', '/dashboard/analytics', '/dashboard/settings'].includes(item.href)
    )
  );

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-16 lg:flex-col bg-white border-r border-gray-200">
      <div className="flex flex-col items-center py-4 space-y-4">
        {/* Logo */}
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0"
          onClick={onExpand}
        >
          <ChatBubbleLeftRightIcon className="h-6 w-6 text-primary" />
        </Button>

        <Separator className="w-8" />

        {/* Main navigation */}
        <nav className="flex flex-col space-y-2">
          {mainItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <TooltipProvider key={item.name}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                        'hover:bg-gray-100',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-gray-500 hover:text-gray-900'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </nav>
      </div>
    </div>
  );
}