import React from 'react'

export function PhoneAuth({
  onSubmit,
  status,
  afterSubmit,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  status: 'pending' | 'idle' | 'success' | 'error'
  afterSubmit?: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 p-8 rounded-lg shadow-lg max-w-2xl w-full my-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-emerald-400 mb-4">
            AI Hacks
          </h1>
          <div className="text-blue-400 font-mono text-sm md:text-base mb-4">
            <span className="text-emerald-400">&gt;</span> SEARCH_PROTOCOL.exe
          </div>
        </div>

        {/* Selling Points */}
        <div className="space-y-6 mb-8">
          <div className="text-center">
            <h2 className="hacker-title text-xl mb-4">
              Welcome to the Matrix of AI Knowledge
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Semantic search across curated AI resources. Discover the most relevant AI tools, 
              tutorials, and insights from the best hacker community on the planet.
            </p>
          </div>

          <div className="border-t border-slate-700 pt-6">
            <div className="text-emerald-400 font-mono text-sm mb-3">
              <span className="text-emerald-400">&gt;</span> Connection established to AI Hacks WhatsApp
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              This search engine is powered by the collective intelligence of the 
              <span className="text-emerald-400 font-semibold"> AI Hacks WhatsApp Community</span> — 
              the best hacker chat ever created. Our curated resources come directly from 
              discussions, discoveries, and breakthroughs shared by elite AI practitioners.
            </p>
            <div className="text-center">
              <a 
                href="https://chat.whatsapp.com/DxSS4FWDLOb7eXP8Y34q1F" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hacker-link font-mono text-sm hover:underline"
              >
                → Join the AI Hacks WhatsApp Community
              </a>
            </div>
          </div>
        </div>

        {/* Phone Auth Form */}
        <div className="border-t border-slate-700 pt-6">
          <h3 className="text-lg font-semibold text-emerald-400 mb-4 text-center">
            Access the Search Protocol
          </h3>
          <p className="text-slate-400 text-sm text-center mb-6">
            Enter your phone number to authenticate with the AI Hacks community
          </p>
          
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onSubmit(e)
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="phone" className="block text-slate-300 text-sm mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                placeholder="+1 (555) 123-4567"
                className="hacker-input w-full"
                required
              />
            </div>
            <button
              type="submit"
              className="hacker-button w-full py-3 mt-6 disabled:opacity-50"
              disabled={status === 'pending'}
            >
              {status === 'pending' ? 'Authenticating...' : 'Enter the Matrix'}
            </button>
            {afterSubmit ? (
              <div className="mt-4">
                {afterSubmit}
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  )
}
