'use client';

import { useState } from 'react';

// Temporary stub for Stack Auth useUser hook
// TODO: Replace with real useUser when @stackframe/stack is installed
const useUserStub = () => null;
import { cn } from '@/lib/utils';
import {
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon,
  SunIcon,
  MoonIcon,
  CommandLineIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HeaderProps {
  onMenuClick: () => void;
}

/**
 * Enhanced Dashboard header component
 *
 * Modern header with improved search, notifications, user menu,
 * and theme/language switching. Optimized for mobile and accessibility.
 */
export function EnhancedHeader({ onMenuClick }: HeaderProps) {
  const user = useUserStub();
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifications] = useState([
    { id: 1, title: 'New chatbot deployed', message: 'Customer Support Assistant is now live', time: '2 min ago', unread: true },
    { id: 2, title: 'Document processed', message: 'Technical manual has been analyzed', time: '5 min ago', unread: true },
    { id: 3, title: 'Training completed', message: 'Sales Assistant model updated', time: '1 hour ago', unread: false },
  ]);
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={onMenuClick}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-5 w-5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Open navigation menu</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Separator */}
      <Separator orientation="vertical" className="h-6 lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Enhanced Search */}
        <div className="relative flex flex-1 max-w-lg">
          <div className={cn(
            "relative flex w-full items-center transition-all duration-200",
            searchFocused && "ring-2 ring-primary ring-offset-2"
          )}>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 h-4 w-4 text-gray-400" />
            <Input
              id="search-field"
              className={cn(
                "h-9 w-full border-gray-200 pl-10 pr-12 text-sm transition-all duration-200",
                "focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0",
                "placeholder:text-gray-400"
              )}
              placeholder="Search chatbots, conversations, documents..."
              type="search"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <div className="absolute right-2 flex items-center gap-1">
              <Badge variant="secondary" className="h-6 px-1.5 text-xs font-mono">
                ⌘K
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-x-2 lg:gap-x-3">
          {/* Quick Actions */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden lg:inline-flex">
                  <CommandLineIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Command palette (⌘K)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Language switcher */}
          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <GlobeAltIcon className="h-4 w-4" />
                      <span className="sr-only">Switch language</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Switch language</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Language</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center gap-2">
                <span className="text-lg">🇺🇸</span>
                <span>English</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2">
                <span className="text-lg">🇹🇭</span>
                <span>ไทย</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme switcher */}
          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <SunIcon className="h-4 w-4" />
                      <span className="sr-only">Switch theme</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Switch theme</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center gap-2">
                <SunIcon className="h-4 w-4" />
                <span>Light</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2">
                <MoonIcon className="h-4 w-4" />
                <span>Dark</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2">
                <Cog6ToothIcon className="h-4 w-4" />
                <span>System</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="relative">
                      <BellIcon className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                        >
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                      )}
                      <span className="sr-only">View notifications</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Notifications {unreadCount > 0 && `(${unreadCount} new)`}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} new
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3">
                    <div className="flex w-full items-center justify-between">
                      <span className="font-medium text-sm">{notification.title}</span>
                      {notification.unread && (
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{notification.message}</p>
                    <span className="text-xs text-gray-400">{notification.time}</span>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center font-medium">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Separator */}
          <Separator orientation="vertical" className="hidden lg:block h-6" />

          {/* User menu */}
          <div className="flex items-center">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-3 px-2 py-1.5 h-auto">
                    <div className="hidden lg:flex lg:flex-col lg:items-end lg:text-sm lg:leading-tight">
                      <p className="font-medium text-gray-900">{user.displayName || 'User'}</p>
                      <p className="text-xs text-gray-500">{user.primaryEmail}</p>
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.profileImageUrl || undefined} alt={user.displayName || 'User'} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                        {(user.displayName || user.primaryEmail || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="font-medium">{user.displayName || 'User'}</p>
                      <p className="text-xs text-gray-500">{user.primaryEmail}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <span>Profile Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Account Preferences</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Billing</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <span>Help & Support</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={() => user.signOut()}>
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-x-2">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
                <Button size="sm">
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Header breadcrumb component
 *
 * Provides navigation breadcrumbs for the current page
 */
interface HeaderBreadcrumbProps {
  items: Array<{
    name: string;
    href?: string;
    current?: boolean;
  }>;
}

export function HeaderBreadcrumb({ items }: HeaderBreadcrumbProps) {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol role="list" className="flex items-center space-x-4">
        {items.map((item, index) => (
          <li key={item.name}>
            <div className="flex items-center">
              {index > 0 && (
                <svg
                  className="mr-4 h-5 w-5 flex-shrink-0 text-gray-300"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
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
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  {item.name}
                </a>
              ) : (
                <span
                  className={cn(
                    'text-sm font-medium',
                    item.current ? 'text-gray-900' : 'text-gray-500'
                  )}
                >
                  {item.name}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}