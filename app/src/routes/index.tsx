import { createFileRoute, redirect, useLoaderData } from '@tanstack/react-router'
import { SearchResults } from '../components/SearchResults'
import { getTrendingResources } from '../utils/search'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({
        to: '/phone-login',
      })
    }
  },
  loader: async () => {
    const trendingResources = await getTrendingResources()
    return { trendingResources }
  },
  component: Home,
})

function Home() {
  const { trendingResources } = useLoaderData({ from: '/' })
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Navigate to search page with query
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-block">
              <h1 className="text-4xl md:text-6xl font-bold text-emerald-400 mb-4">
                AI Hacks
              </h1>
              <div className="text-blue-400 font-mono text-sm md:text-base mb-4">
                <span className="text-emerald-400">&gt;</span> Discover trending AI resources, tools, and insights
              </div>
              <div className="text-slate-400 font-mono text-xs mb-6">
                Curated collection of the most valuable AI resources, ranked by community engagement
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400 font-mono text-sm">
                    $
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search AI resources with our intelligent agent..."
                    className="w-full hacker-input pl-8 pr-4 py-3 placeholder-slate-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!searchQuery.trim()}
                  className="hacker-button py-3 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Trending Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                <span>🔥</span>
                <span>Trending Now</span>
              </h2>
              <div className="text-slate-400 font-mono text-sm">
                {trendingResources.length} resources • Updated continuously
              </div>
            </div>
            
            <div className="text-slate-400 font-mono text-sm mb-4 border-b border-slate-700 pb-2">
              Resources ranked by recency, community reactions, and evergreen value
            </div>
          </div>

          {/* Trending Resources */}
          <SearchResults results={trendingResources} isLoading={false} />
        </div>
      </div>
    </div>
  )
}
