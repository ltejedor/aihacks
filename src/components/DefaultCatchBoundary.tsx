import * as React from 'react'
import {
  ErrorComponent,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  })

  console.error(error)

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-red-500 mb-4">
            Something went wrong
          </h1>
          <div className="text-emerald-400 font-mono text-sm mb-2">
            Application Error
          </div>
          <div className="text-slate-400 font-sans text-sm mb-6">
            An unexpected error occurred. Our team has been notified and is working on a fix.
          </div>
        </div>
        
        {/* Error Details */}
        <div className="bg-slate-800 border border-red-500 p-4 mb-6 text-left rounded-md">
          <div className="text-red-400 font-mono text-xs mb-2">
            Error Details:
          </div>
          <div className="text-slate-100 font-mono text-xs break-all">
            <ErrorComponent error={error} />
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="text-slate-500 font-mono text-xs mb-4">
            Recovery Options:
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                router.invalidate()
              }}
              className="hacker-button py-3 px-6"
            >
              Try Again
            </button>
            {isRoot ? (
              <Link
                to="/"
                className="hacker-button py-3 px-6 text-center"
              >
                Go Home
              </Link>
            ) : (
              <Link
                to="/"
                className="hacker-button py-3 px-6 text-center"
                onClick={(e) => {
                  e.preventDefault()
                  window.history.back()
                }}
              >
                Go Back
              </Link>
            )}
          </div>
        </div>
        
        <div className="mt-8 text-slate-600 font-mono text-xs">
          Status: <span className="text-red-400">Error</span>
        </div>
      </div>
    </div>
  )
}
