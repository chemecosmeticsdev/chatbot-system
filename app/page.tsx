import ApiTestDashboard from './components/ApiTestDashboard';
import { getSafeConfig } from '../lib/config';

export default function Home() {
  // Validate environment during SSR but don't fail
  try {
    getSafeConfig();
  } catch (error) {
    console.error('Environment validation failed during SSR:', error);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <ApiTestDashboard />
    </main>
  );
}