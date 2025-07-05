import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { SearchInput } from '../components/SearchInput'
import { SearchResults } from '../components/SearchResults'
import { SearchResult, getTrendingResources } from '../utils/search'

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => {
    const trendingResources = await getTrendingResources()
    return { trendingResources }
  }
})

function Home() {
  const { trendingResources } = Route.useLoaderData()
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
                <span className="animate-pulse">&gt;</span> Performing vector similarity search across curated AI resources <span className="animate-pulse terminal-cursor"></span>
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
          
          {/* Search Results */}
          {(hasSearched || isLoading) && (
            <SearchResults results={results} isLoading={isLoading} />
          )}

          {/* Trending Resources - shown when not searching */}
          {!hasSearched && !isLoading && (
            <div className="space-y-6">
              <div className="text-hacker-green font-mono text-sm mb-4 border-b border-hacker-border pb-2">
                Trending Resources ({trendingResources.length})
              </div>
              <div className="text-hacker-text-dim font-mono text-xs mb-6">
                Displaying combination of newest resources and most reacted content from the AI knowledge matrix...
              </div>
              <SearchResults results={trendingResources} isLoading={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
