import { Link } from '@tanstack/react-router'

export function NotFound({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-hacker-bg flex items-center justify-center">
      <div className="max-w-md mx-auto text-center p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-hacker text-hacker-red mb-4 glitch-text animate-flicker" data-text="404">
            404
          </h1>
          <div className="text-hacker-green font-mono text-sm mb-2">
            [ERROR: RESOURCE_NOT_FOUND]
          </div>
          <div className="text-hacker-text-dim font-mono text-xs mb-6">
            {children || <p>The requested resource does not exist in the knowledge matrix.</p>}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="text-hacker-text-dim font-mono text-xs mb-4">
            AVAILABLE_ACTIONS:
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.history.back()}
              className="hacker-button w-full py-3 hover:animate-pulse-green"
            >
              [GO_BACK]
            </button>
            <Link
              to="/"
              className="hacker-button w-full py-3 text-center hover:animate-pulse-green block"
            >
              [RETURN_TO_TERMINAL]
            </Link>
          </div>
        </div>
        
        <div className="mt-8 text-hacker-text-darker font-mono text-xs">
          SYSTEM_STATUS: <span className="text-hacker-red">RESOURCE_UNAVAILABLE</span>
        </div>
      </div>
    </div>
  )
}
