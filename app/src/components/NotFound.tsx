import { Link } from '@tanstack/react-router'

export function NotFound({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center p-8">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-red-500 mb-4">
            404
          </h1>
          <div className="text-emerald-400 font-mono text-sm mb-2">
            Page Not Found
          </div>
          <div className="text-slate-400 font-sans text-sm mb-6">
            {children || <p>The page you're looking for doesn't exist or has been moved.</p>}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="text-slate-500 font-mono text-xs mb-4">
            What would you like to do?
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.history.back()}
              className="hacker-button w-full py-3"
            >
              Go Back
            </button>
            <Link
              to="/"
              className="hacker-button w-full py-3 text-center block"
            >
              Return Home
            </Link>
          </div>
        </div>
        
        <div className="mt-8 text-slate-600 font-mono text-xs">
          Status: <span className="text-red-400">Not Found</span>
        </div>
      </div>
    </div>
  )
}
