import React, { useState, useEffect } from 'react'
import { useMutation } from '../hooks/useMutation'
import { searchResources, SearchResult } from '../utils/search'

interface SearchInputProps {
  onResults: (results: SearchResult[]) => void
  onSearchStart?: () => void
}

export function SearchInput({ onResults, onSearchStart }: SearchInputProps) {
  const [query, setQuery] = useState('')
  
  const searchMutation = useMutation({
    fn: searchResources,
    onSuccess: ({ data }) => {
      console.log('Search completed successfully:', data)
      onResults(data)
    }
  })

  // Notify parent when search status changes
  useEffect(() => {
    if (searchMutation.status === 'pending' && onSearchStart) {
      onSearchStart()
    }
  }, [searchMutation.status, onSearchStart])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      console.log('Starting search for:', query)
      searchMutation.mutate({ data: query })
    }
  }

  // Log errors when they occur
  React.useEffect(() => {
    if (searchMutation.error) {
      console.error('Search failed:', searchMutation.error)
    }
  }, [searchMutation.error])

  return (
    <div className="mb-8">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400 font-mono text-sm">
            $
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about AI agents, e.g., 'Best frameworks for building AI agents?'"
            className="w-full hacker-input pl-8 pr-4 py-3 placeholder-slate-500"
            disabled={searchMutation.status === 'pending'}
          />
        </div>
        <button
          type="submit"
          disabled={searchMutation.status === 'pending' || !query.trim()}
          className="hacker-button py-3 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {searchMutation.status === 'pending' ? 'Searching...' : 'Search'}
        </button>
      </form>
      
      {searchMutation.error && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-500 text-red-400 font-mono text-sm rounded-md">
          <span className="text-red-400 font-semibold">Error:</span> {searchMutation.error.message}
        </div>
      )}
    </div>
  )
}
