'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Application Error
            </h1>
            <p className="text-gray-600 mb-4">
              Something went wrong with the application.
            </p>
            <details className="mb-4">
              <summary className="cursor-pointer text-sm text-gray-500">
                Error Details
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {error.message}
                {error.digest && `\nDigest: ${error.digest}`}
              </pre>
            </details>
            <div className="space-y-2">
              <button
                onClick={reset}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Try again
              </button>
              <a
                href="/api/health"
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded block text-center"
              >
                Check Health Status
              </a>
              <a
                href="/api/simple-test"
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded block text-center"
              >
                Simple API Test
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}