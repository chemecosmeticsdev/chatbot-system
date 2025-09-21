'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface FallbackUser {
  id: string;
  displayName: string;
  primaryEmail: string;
  profileImageUrl?: string;
  signOut: () => void;
}

interface FallbackAuthContextType {
  user: FallbackUser | null | undefined;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signOut: () => void;
  isLoading: boolean;
  error: string | null;
}

const FallbackAuthContext = createContext<FallbackAuthContextType | null>(null);

interface FallbackAuthProviderProps {
  children: ReactNode;
}

/**
 * Fallback authentication provider for development and offline scenarios
 *
 * This provider creates a mock authentication system that works without
 * external dependencies, useful for development and network connectivity issues.
 */
export function FallbackAuthProvider({ children }: FallbackAuthProviderProps) {
  const [user, setUser] = useState<FallbackUser | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check for existing session in localStorage
    const savedUser = localStorage.getItem('fallback-auth-user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser({
          ...userData,
          signOut: () => signOut(),
        });
      } catch (error) {
        console.error('Failed to parse saved user data:', error);
        localStorage.removeItem('fallback-auth-user');
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock authentication - in a real app, this would be an API call
      if (email && password) {
        const mockUser = {
          id: `user_${Date.now()}`,
          displayName: email.split('@')[0],
          primaryEmail: email,
          profileImageUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${email}`,
        };

        const userWithSignOut = {
          ...mockUser,
          signOut: () => signOut(),
        };

        setUser(userWithSignOut);
        localStorage.setItem('fallback-auth-user', JSON.stringify(mockUser));
        setIsLoading(false);
        return true;
      } else {
        setError('Please provide valid email and password');
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      setError('Sign in failed. Please try again.');
      setIsLoading(false);
      return false;
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock registration - in a real app, this would be an API call
      if (email && password && name) {
        const mockUser = {
          id: `user_${Date.now()}`,
          displayName: name,
          primaryEmail: email,
          profileImageUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${email}`,
        };

        const userWithSignOut = {
          ...mockUser,
          signOut: () => signOut(),
        };

        setUser(userWithSignOut);
        localStorage.setItem('fallback-auth-user', JSON.stringify(mockUser));
        setIsLoading(false);
        return true;
      } else {
        setError('Please provide all required information');
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      setError('Sign up failed. Please try again.');
      setIsLoading(false);
      return false;
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('fallback-auth-user');
    router.push('/');
  };

  const value: FallbackAuthContextType = {
    user,
    signIn,
    signUp,
    signOut,
    isLoading,
    error,
  };

  return (
    <FallbackAuthContext.Provider value={value}>
      {children}
    </FallbackAuthContext.Provider>
  );
}

export function useFallbackAuth() {
  const context = useContext(FallbackAuthContext);
  if (!context) {
    throw new Error('useFallbackAuth must be used within a FallbackAuthProvider');
  }
  return context;
}

/**
 * Hook that mimics Stack Auth's useUser hook for compatibility
 */
export function useFallbackUser(options?: { or?: 'redirect' }) {
  const { user, isLoading } = useFallbackAuth();
  const router = useRouter();

  useEffect(() => {
    if (options?.or === 'redirect' && !isLoading && !user) {
      router.push('/auth/sign-in');
    }
  }, [user, isLoading, options?.or, router]);

  return user;
}