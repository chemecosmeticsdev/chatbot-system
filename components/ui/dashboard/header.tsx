'use client';

import { Fragment, useState } from 'react';

// Temporary stubs for Stack Auth
// TODO: Replace with real hooks when @stackframe/stack is installed
const useUserStub = () => null;
const UserButtonStub = () => (
  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs">
    U
  </div>
);
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
export function Header({ onMenuClick }: HeaderProps) {
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
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Search */}
        <form className="relative flex flex-1" action="#" method="GET">
          <label htmlFor="search-field" className="sr-only">
            Search
          </label>
          <MagnifyingGlassIcon
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400"
            aria-hidden="true"
          />
          <Input
            id="search-field"
            className="block h-full w-full border-0 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
            placeholder="Search chatbots, conversations, documents..."
            type="search"
            name="search"
          />
        </form>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Language switcher */}
          <Menu as="div" className="relative">
            <Menu.Button className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500">
              <span className="sr-only">Switch language</span>
              <GlobeAltIcon className="h-6 w-6" aria-hidden="true" />
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={cn(
                        'block px-3 py-1 text-sm leading-6 text-gray-900',
                        active && 'bg-gray-50'
                      )}
                    >
                      🇺🇸 English
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={cn(
                        'block px-3 py-1 text-sm leading-6 text-gray-900',
                        active && 'bg-gray-50'
                      )}
                    >
                      🇹🇭 ไทย
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>

          {/* Theme switcher */}
          <Menu as="div" className="relative">
            <Menu.Button className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500">
              <span className="sr-only">Switch theme</span>
              <SunIcon className="h-6 w-6" aria-hidden="true" />
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={cn(
                        'flex items-center gap-2 px-3 py-1 text-sm leading-6 text-gray-900',
                        active && 'bg-gray-50'
                      )}
                    >
                      <SunIcon className="h-4 w-4" />
                      Light
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={cn(
                        'flex items-center gap-2 px-3 py-1 text-sm leading-6 text-gray-900',
                        active && 'bg-gray-50'
                      )}
                    >
                      <MoonIcon className="h-4 w-4" />
                      Dark
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>

          {/* Notifications */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />

          {/* User menu */}
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center gap-x-3">
                <div className="hidden lg:flex lg:flex-col lg:items-end lg:text-sm lg:leading-6">
                  <p className="text-gray-900">{user.displayName || 'User'}</p>
                  <p className="text-xs text-gray-500">{user.primaryEmail}</p>
                </div>
                <UserButtonStub />
              </div>
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