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
} from '@heroicons/react/24/outline';

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Navigation items
const navigation = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: HomeIcon,
    description: 'Dashboard overview and metrics'
  },
  {
    name: 'Products',
    href: '/dashboard/products',
    icon: FolderIcon,
    description: 'Manage knowledge base products'
  },
  {
    name: 'Documents',
    href: '/dashboard/documents',
    icon: DocumentIcon,
    description: 'Upload and process documents'
  },
  {
    name: 'Chatbots',
    href: '/dashboard/chatbots',
    icon: ChatBubbleLeftRightIcon,
    description: 'Create and manage chatbot instances'
  },
  {
    name: 'Conversations',
    href: '/dashboard/conversations',
    icon: ChatBubbleLeftRightIcon,
    description: 'View conversation history'
  },
  {
    name: 'Vector Search',
    href: '/dashboard/search',
    icon: MagnifyingGlassIcon,
    description: 'Test vector search functionality'
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: ChartBarIcon,
    description: 'Performance and usage analytics'
  },
  {
    name: 'Playground',
    href: '/dashboard/playground',
    icon: ChatBubbleLeftRightIcon,
    description: 'Test chatbot conversations'
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: CogIcon,
    description: 'System configuration'
  }
];

/**
 * Sidebar navigation component
 *
 * Provides responsive navigation for the dashboard with mobile overlay support.
 * Includes icons, active states, and Thai/English internationalization ready.
 */
export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const pathname = usePathname();

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6">
        <div className="flex items-center space-x-2">
          <ChatBubbleLeftRightIcon className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-gray-900">
            ChatBot Manager
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col px-4 pb-4">
        <ul role="list" className="flex flex-1 flex-col gap-y-1">
          <li>
            <ul role="list" className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-x-3 rounded-md p-3 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      )}
                      title={item.description}
                    >
                      <item.icon
                        className={cn(
                          'h-5 w-5 shrink-0',
                          isActive
                            ? 'text-primary-foreground'
                            : 'text-gray-400 group-hover:text-gray-500'
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>

          {/* Footer info */}
          <li className="mt-auto">
            <div className="rounded-md bg-gray-50 p-4">
              <div className="text-xs text-gray-600">
                <div className="font-medium">Chatbot Management</div>
                <div className="mt-1">
                  Multi-language support for Thai/English markets
                </div>
              </div>
            </div>
          </li>
        </ul>
      </nav>
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
            <div className="fixed inset-0 bg-gray-900/80" />
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
                    <button
                      type="button"
                      className="-m-2.5 p-2.5"
                      onClick={() => onOpenChange(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                <SidebarContent />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <SidebarContent />
      </div>
    </>
  );
}