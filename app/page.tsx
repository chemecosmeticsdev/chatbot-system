'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bot, MessageSquare, Zap, Shield, Globe, BarChart3, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useUniversalUser, useHybridAuth } from '@/lib/auth/hybrid-auth-provider';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
        <p className="text-gray-600">Checking authentication status</p>
      </div>
    </div>
  );
}

function LandingPage() {
  const { authMode, networkError, retryStackAuth } = useHybridAuth();

  const getSignInLink = () => {
    return authMode === 'stack' ? '/handler/sign-in' : '/auth/sign-in';
  };

  const getSignUpLink = () => {
    return authMode === 'stack' ? '/handler/sign-up' : '/auth/sign-up';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Network Status Alert */}
      {networkError && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 flex items-center justify-between">
                <span>{networkError}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={retryStackAuth}
                  className="ml-4 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-gray-900">ChatBot Manager</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href={getSignInLink()}>
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  Sign In
                </Button>
              </Link>
              <Link href={getSignUpLink()}>
                <Button className="bg-primary hover:bg-primary/90">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Build Intelligent Chatbots
            <span className="text-primary block">for Any Business</span>
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
            Create, deploy, and manage AI-powered chatbots with advanced knowledge management,
            multi-model support, and comprehensive analytics. Perfect for customer service,
            support, and engagement.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <Link href="/handler/sign-up">
              <Button size="lg" className="bg-primary hover:bg-primary/90 px-8 py-4 text-lg">
                Start Building Free
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="px-8 py-4 text-lg">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need for Smart Chatbots
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Professional-grade tools and features to create chatbots that actually understand
              your business and customers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-solid hover:shadow-lg transition-shadow">
              <CardHeader>
                <MessageSquare className="h-10 w-10 text-primary mb-4" />
                <CardTitle className="text-xl">Multi-Model Support</CardTitle>
                <CardDescription>
                  Choose from Claude, GPT, Bedrock, and other leading AI models for optimal performance
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-solid hover:shadow-lg transition-shadow">
              <CardHeader>
                <Zap className="h-10 w-10 text-primary mb-4" />
                <CardTitle className="text-xl">Smart Knowledge Base</CardTitle>
                <CardDescription>
                  Upload documents, process content with OCR, and create intelligent vector-based knowledge retrieval
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-solid hover:shadow-lg transition-shadow">
              <CardHeader>
                <BarChart3 className="h-10 w-10 text-primary mb-4" />
                <CardTitle className="text-xl">Advanced Analytics</CardTitle>
                <CardDescription>
                  Track conversations, monitor performance, and gain insights into user behavior and satisfaction
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-solid hover:shadow-lg transition-shadow">
              <CardHeader>
                <Globe className="h-10 w-10 text-primary mb-4" />
                <CardTitle className="text-xl">Multi-Platform Integration</CardTitle>
                <CardDescription>
                  Deploy to websites, Line OA, social media, and custom platforms with flexible integration options
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-solid hover:shadow-lg transition-shadow">
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-4" />
                <CardTitle className="text-xl">Enterprise Security</CardTitle>
                <CardDescription>
                  Role-based access control, data encryption, and compliance features for business-grade security
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-solid hover:shadow-lg transition-shadow">
              <CardHeader>
                <Bot className="h-10 w-10 text-primary mb-4" />
                <CardTitle className="text-xl">Easy Management</CardTitle>
                <CardDescription>
                  Intuitive dashboard for creating, configuring, and monitoring multiple chatbot instances
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-6">
            Ready to Transform Your Customer Experience?
          </h3>
          <p className="text-xl opacity-90 mb-10">
            Join thousands of businesses already using our platform to create
            intelligent, helpful chatbots that customers love.
          </p>
          <Link href="/handler/sign-up">
            <Button size="lg" className="bg-white text-primary hover:bg-gray-100 px-8 py-4 text-lg font-semibold">
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Bot className="h-6 w-6" />
            <span className="text-xl font-bold">ChatBot Manager</span>
          </div>
          <p className="text-gray-400 mb-6">
            Professional chatbot management platform for modern businesses.
          </p>
          <div className="flex justify-center space-x-6 text-sm text-gray-400">
            <Link href="/handler/sign-in" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/handler/sign-up" className="hover:text-white transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  const user = useUniversalUser();
  const router = useRouter();

  useEffect(() => {
    // If user is authenticated, redirect to dashboard
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Show loading screen while checking authentication
  if (user === undefined) {
    return <LoadingScreen />;
  }

  // If user is authenticated, they'll be redirected to dashboard
  // Show loading screen during redirect
  if (user) {
    return <LoadingScreen />;
  }

  // Show landing page for unauthenticated users
  return <LandingPage />;
}