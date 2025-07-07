export function Auth({
  actionText,
  onSubmit,
  status,
  afterSubmit,
}: {
  actionText: string
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  status: 'pending' | 'idle' | 'success' | 'error'
  afterSubmit?: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-8">
      <div className="bg-slate-800 border border-slate-700 p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-semibold text-emerald-400 mb-6 text-center">
          {actionText}
        </h1>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(e)
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-slate-300 text-sm mb-2">
              Username
            </label>
            <input
              type="email"
              name="email"
              id="email"
              className="hacker-input w-full"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-slate-300 text-sm mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              id="password"
              className="hacker-input w-full"
            />
          </div>
          <button
            type="submit"
            className="hacker-button w-full py-3 mt-6 disabled:opacity-50"
            disabled={status === 'pending'}
          >
            {status === 'pending' ? 'Processing...' : actionText}
          </button>
          {afterSubmit ? (
            <div className="mt-4">
              {afterSubmit}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  )
}
