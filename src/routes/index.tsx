import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { SearchInput } from '../components/SearchInput'
import { SearchResults } from '../components/SearchResults'
import { SearchResult } from '../utils/search'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleResults = useCallback((newResults: SearchResult[]) => {
    console.log('Received search results:', newResults)
    setResults(newResults)
    setIsLoading(false)
    setHasSearched(true)
  }, [])

  const handleSearchStart = useCallback(() => {
    setIsLoading(true)
    setHasSearched(false)
  }, [])

  return (
    <div className="min-h-screen bg-hacker-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Terminal Header */}
          <div className="mb-8 text-center">
            <div className="inline-block">
              <h1 className="text-4xl md:text-6xl font-hacker text-hacker-green mb-2 glitch-text animate-flicker" data-text="AI_HACKS">
                AI_HACKS
              </h1>
              <div className="text-hacker-cyan font-mono text-sm md:text-base mb-4">
                <span className="animate-pulse">&gt;</span> NEURAL_SEARCH_PROTOCOL_v2.1 <span className="animate-pulse terminal-cursor"></span>
              </div>
              <div className="text-hacker-text-dim font-mono text-xs mb-6">
                [ACCESSING_KNOWLEDGE_MATRIX...] <span className="text-hacker-green">CONNECTED</span>
              </div>
            </div>
          </div>

          {/* Search Interface */}
          <SearchInput 
            onResults={handleResults} 
            onSearchStart={handleSearchStart}
          />
          
          {/* Results */}
          {(hasSearched || isLoading) && (
            <SearchResults results={results} isLoading={isLoading} />
          )}

          {/* Footer */}
          {!hasSearched && !isLoading && (
            <div className="mt-12 text-center text-hacker-text-dim font-mono text-xs">
              <div className="mb-2">SYSTEM_STATUS: <span className="text-hacker-green">ONLINE</span></div>
              <div>QUERY_BUFFER: <span className="text-hacker-cyan">READY</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
