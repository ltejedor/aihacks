import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { SearchInput } from '../components/SearchInput'
import { SearchResults } from '../components/SearchResults'
import { SearchResult } from '../utils/search'

export const Route = createFileRoute('/search')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({
        to: '/phone-login',
      })
    }
  },
  component: SearchPage,
})

function SearchPage() {
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Hacks Resources
        </h1>
        <p className="text-gray-600 mb-8">
          Search through our curated collection of AI resources, tools, and documentation.
        </p>
        
        <SearchInput 
          onResults={handleResults} 
          onSearchStart={handleSearchStart}
        />
        
        {(hasSearched || isLoading) && (
          <SearchResults results={results} isLoading={isLoading} />
        )}
      </div>
    </div>
  )
}
