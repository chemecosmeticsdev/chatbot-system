import { Suspense } from 'react';
import ApiTestDashboard from './components/ApiTestDashboard';

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        <p className="text-gray-600">Initializing API Test Dashboard</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Suspense fallback={<LoadingFallback />}>
        <ApiTestDashboard />
      </Suspense>
    </main>
  );
}