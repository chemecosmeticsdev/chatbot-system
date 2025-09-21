import type { Metadata } from 'next'
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "../stack";
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
              {children}
            </StackTheme>
          </StackProvider>
        ) : (
          // Fallback when Stack Auth is not available
          <div>
            {children}
          </div>
        )}
      </body>
    </html>
  )
}