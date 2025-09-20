'use client';

import { useUser } from "@stackframe/stack";
import { useState } from "react";
import Link from "next/link";

export default function AdminPage() {
  const user = useUser();
  const [adminStatus, setAdminStatus] = useState<string>('');

  const promoteToSuperAdmin = async () => {
    if (!user) return;

    try {
      setAdminStatus('Promoting to SuperAdmin...');

      // In a real implementation, you would:
      // 1. Check if user is allowed to be SuperAdmin
      // 2. Update user role in database
      // 3. Set appropriate permissions

      // For demo purposes, we'll just simulate this
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAdminStatus(`✅ User ${user.displayName || user.primaryEmail} promoted to SuperAdmin`);

    } catch (error) {
      setAdminStatus(`❌ Failed to promote user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-6">SuperAdmin Access</h1>
          <p className="text-gray-600 text-center mb-6">
            Please sign in to access the admin panel.
          </p>
          <div className="text-center">
            <Link
              href="/handler/sign-in"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-block"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">SuperAdmin Panel</h1>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Current User</h2>
            <div className="bg-gray-50 p-4 rounded">
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Name:</strong> {user.displayName || 'Not set'}</p>
              <p><strong>Email:</strong> {user.primaryEmail}</p>
              <p><strong>Status:</strong> Active User</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">SuperAdmin Actions</h2>
            <div className="space-y-4">
              <button
                onClick={promoteToSuperAdmin}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
              >
                Promote Current User to SuperAdmin
              </button>

              {adminStatus && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  {adminStatus}
                </div>
              )}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-center"
              >
                API Test Dashboard
              </Link>
              <Link
                href="/demo"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg text-center"
              >
                Demo Page
              </Link>
            </div>
          </div>

          <div className="border-t pt-6">
            <button
              onClick={() => user.signOut()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}