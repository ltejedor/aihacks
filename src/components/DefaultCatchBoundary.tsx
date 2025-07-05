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
    <div className="min-h-screen bg-hacker-bg flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-hacker text-hacker-red mb-4 glitch-text animate-flicker" data-text="SYSTEM_ERROR">
            SYSTEM_ERROR
          </h1>
          <div className="text-hacker-green font-mono text-sm mb-2">
            [CRITICAL: EXECUTION_FAILED]
          </div>
          <div className="text-hacker-text-dim font-mono text-xs mb-6">
            An unexpected error occurred in the neural network processing.
          </div>
        </div>
        
        {/* Error Details */}
        <div className="bg-hacker-bg-secondary border border-hacker-red p-4 mb-6 text-left">
          <div className="text-hacker-red font-mono text-xs mb-2">
            ERROR_LOG:
          </div>
          <div className="text-hacker-text font-mono text-xs break-all">
            <ErrorComponent error={error} />
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="text-hacker-text-dim font-mono text-xs mb-4">
            RECOVERY_OPTIONS:
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                router.invalidate()
              }}
              className="hacker-button py-3 px-6 hover:animate-pulse-green"
            >
              [RETRY_OPERATION]
            </button>
            {isRoot ? (
              <Link
                to="/"
                className="hacker-button py-3 px-6 text-center hover:animate-pulse-green"
              >
                [RESTART_TERMINAL]
              </Link>
            ) : (
              <Link
                to="/"
                className="hacker-button py-3 px-6 text-center hover:animate-pulse-green"
                onClick={(e) => {
                  e.preventDefault()
                  window.history.back()
                }}
              >
                [GO_BACK]
              </Link>
            )}
          </div>
        </div>
        
        <div className="mt-8 text-hacker-text-darker font-mono text-xs">
          SYSTEM_STATUS: <span className="text-hacker-red">ERROR_STATE</span>
        </div>
      </div>
    </div>
  )
}
