'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bot,
  FileText,
  Package,
  MessageSquare,
  TrendingUp,
  Users,
  Activity,
  BarChart3,
  Settings,
  PlayCircle
} from 'lucide-react';
import { useUniversalUser } from '@/lib/auth/hybrid-auth-provider';

export default function DashboardPage() {
  const user = useUniversalUser({ or: 'redirect' });
  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to your chatbot management dashboard. Monitor performance, manage content, and configure your AI assistants.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-solid">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Chatbots</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+1</span> from last week
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-solid">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12</span> processed today
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-solid">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+142</span> this week
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-solid">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2.1%</span> improvement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-solid">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Chatbot Management</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Create, configure, and deploy AI chatbot instances with different models and knowledge scopes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/chatbots" className="block">
              <Button
                className="w-full justify-start border-solid"
                size="sm"
              >
                <Settings className="mr-2 h-4 w-4" />
                Manage Chatbots
              </Button>
            </Link>
            <Link href="/dashboard/playground" className="block">
              <Button
                variant="outline"
                className="w-full justify-start border-solid"
                size="sm"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Test Playground
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-solid">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Knowledge Base</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Upload documents, process content, and manage your AI knowledge base for better responses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/documents" className="block">
              <Button
                className="w-full justify-start border-solid"
                size="sm"
              >
                <FileText className="mr-2 h-4 w-4" />
                Manage Documents
              </Button>
            </Link>
            <Link href="/dashboard/products" className="block">
              <Button
                variant="outline"
                className="w-full justify-start border-solid"
                size="sm"
              >
                <Package className="mr-2 h-4 w-4" />
                Manage Products
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-solid">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Analytics & Insights</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Monitor conversations, analyze performance, and track user engagement metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/conversations" className="block">
              <Button
                className="w-full justify-start border-solid"
                size="sm"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                View Conversations
              </Button>
            </Link>
            <Link href="/dashboard/analytics" className="block">
              <Button
                variant="outline"
                className="w-full justify-start border-solid"
                size="sm"
              >
                <Activity className="mr-2 h-4 w-4" />
                Performance Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card className="border-solid">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>System Health</CardTitle>
          </div>
          <CardDescription>
            Current status of all system components and integrations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium">Database</span>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-200">Online</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium">AWS Bedrock</span>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-200">Ready</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium">Authentication</span>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium">S3 Storage</span>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-200">Ready</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm font-medium">Vector Search</span>
              </div>
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Setup Needed</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium">Monitoring</span>
              </div>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}