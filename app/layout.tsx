import type { Metadata } from 'next'
import { AuthProvider } from "@/lib/auth/hybrid-auth-provider";
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
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}