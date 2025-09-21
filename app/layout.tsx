import type { Metadata } from 'next'
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "../stack";
import { HybridAuthProvider } from "@/lib/auth/hybrid-auth-provider";
import './globals.css'

export const metadata: Metadata = {
  title: 'ChatBot Manager - Professional AI Chatbot Platform',
  description: 'Create, deploy, and manage intelligent AI chatbots with advanced knowledge management, multi-model support, and comprehensive analytics.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {stackServerApp ? (
          <StackProvider app={stackServerApp as any}>
            <StackTheme>
              <HybridAuthProvider>
                {children}
              </HybridAuthProvider>
            </StackTheme>
          </StackProvider>
        ) : (
          // Fallback when Stack Auth is not available
          <HybridAuthProvider>
            {children}
          </HybridAuthProvider>
        )}
      </body>
    </html>
  )
}