import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/stack";

export default function Handler(props: { params: any, searchParams: any }) {
  // Handle case where Stack Auth is not properly initialized
  if (!stackServerApp) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-6 text-red-600">Authentication Service Error</h1>
          <p className="text-gray-600 text-center mb-6">
            Stack Auth is not properly configured. Please check environment variables and try again.
          </p>
          <div className="text-center">
            <a
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-block"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StackHandler
      app={stackServerApp}
      routeProps={props}
      fullPage={true}
    />
  );
}