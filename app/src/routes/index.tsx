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
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-block">
              <h1 className="text-4xl md:text-6xl font-bold text-emerald-400 mb-4">
                AI Hacks
              </h1>
              <div className="text-blue-400 font-mono text-sm md:text-base mb-4">
                <span className="text-emerald-400">&gt;</span> Semantic search across curated AI resources
              </div>
              <div className="text-slate-400 font-mono text-xs mb-6">
                Discover the most relevant AI tools, tutorials, and insights
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
              <div className="text-emerald-400 font-mono text-sm mb-4 border-b border-slate-700 pb-2">
                Trending Resources ({trendingResources.length})
              </div>
              <div className="text-slate-400 font-sans text-sm mb-6">
                Discover the newest and most popular AI resources from our curated collection
              </div>
              <SearchResults results={trendingResources} isLoading={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
