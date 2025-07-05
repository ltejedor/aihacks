import { SearchResult } from '../utils/search'
import React, { useState } from 'react'

interface SearchResultsProps {
  results: SearchResult[]
  isLoading: boolean
}

function extractLinks(content: string): string[] {
  const urlRegex = /https?:\/\/[^\s\n]+/g
  return content.match(urlRegex) || []
}

function formatContentWithLinks(content: string): React.ReactElement {
  const urlRegex = /(https?:\/\/[^\s\n]+)/g
  const parts = content.split(urlRegex)
  
  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-emerald-400 transition-colors break-all block"
            >
              → {part}
            </a>
          )
        }
        return <span key={index} className="whitespace-pre-wrap">{part}</span>
      })}
    </div>
  )
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showFullContent, setShowFullContent] = useState(false)
  
  const links = extractLinks(result.content)
  const hasLinks = links.length > 0
  const isLongContent = result.content.length > 500
  
  const generateShareableLink = (resourceId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/resource/${resourceId}`
    }
    return `/resource/${resourceId}`
  }
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg mb-6 overflow-hidden">
      {/* Header - Clean Title Section */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="text-slate-500 font-mono text-xs mb-1">
              ID: {result.metadata.resource_id}
            </div>
            <h3 className="text-xl md:text-2xl font-semibold text-emerald-400 mb-2 leading-tight">
              {result.metadata.title}
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono ml-4">
            <span className="flex items-center gap-1 text-blue-400">
              <span>↑</span>
              <span>{result.metadata.reaction_count}</span>
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span>★</span>
              <span>{result.metadata.evergreen_rating}</span>
            </span>
          </div>
        </div>
        
        {/* Tags and Date */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-wrap gap-2">
            {result.metadata.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-block bg-slate-700 text-emerald-400 text-xs px-2 py-1 font-mono rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="text-xs font-mono text-slate-400">
            {new Date(result.metadata.date).toLocaleDateString()}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-400 hover:text-emerald-400 transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
          <button
            onClick={() => copyToClipboard(generateShareableLink(result.metadata.resource_id))}
            className="text-blue-400 hover:text-emerald-400 transition-colors"
          >
            Copy Link
          </button>
          <a
            href={generateShareableLink(result.metadata.resource_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-emerald-400 transition-colors"
          >
            Open Resource
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isExpanded ? (
          <div className="space-y-4">
            <div className="text-slate-100 font-sans text-sm leading-relaxed">
              {formatContentWithLinks(result.content)}
            </div>
            
            {/* Links section */}
            {hasLinks && (
              <div className="border-t border-slate-700 pt-4">
                <h4 className="text-emerald-400 font-semibold text-sm mb-3">
                  Documentation Links ({links.length})
                </h4>
                <div className="grid gap-2">
                  {links.map((link, index) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-slate-700 border border-slate-600 hover:border-emerald-500 transition-colors rounded-md"
                    >
                      <span className="text-blue-400 font-mono">→</span>
                      <span className="text-blue-400 hover:text-emerald-400 text-xs break-all transition-colors">
                        {link}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-slate-100 font-sans text-sm leading-relaxed">
              {isLongContent ? (
                <div>
                  <p className="mb-2">{result.content.substring(0, 300)}...</p>
                  <button
                    onClick={() => setShowFullContent(!showFullContent)}
                    className="text-blue-400 hover:text-emerald-400 text-xs transition-colors"
                  >
                    {showFullContent ? 'Hide Preview' : 'Show Preview'}
                  </button>
                  {showFullContent && (
                    <div className="mt-3 text-slate-100 font-sans text-sm leading-relaxed">
                      {formatContentWithLinks(result.content)}
                    </div>
                  )}
                </div>
              ) : (
                formatContentWithLinks(result.content)
              )}
            </div>
            
            {/* Links preview */}
            {hasLinks && (
              <div className="border-t border-slate-700 pt-3">
                <div className="mb-2">
                  <span className="text-emerald-400 font-semibold text-xs">Links:</span>
                </div>
                <div className="grid gap-1">
                  {links.slice(0, 3).map((link, index) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-blue-400 hover:text-emerald-400 transition-colors"
                    >
                      <span className="text-blue-400">→</span>
                      <span className="truncate">{link}</span>
                    </a>
                  ))}
                  {links.length > 3 && (
                    <div className="text-xs text-slate-400 font-mono">
                      ... and {links.length - 3} more link{links.length - 3 === 1 ? '' : 's'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Similarity score */}
        {result.similarity && (
          <div className="mt-4 pt-3 border-t border-slate-700 text-xs font-mono text-slate-500">
            Similarity: {(result.similarity * 100).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  )
}

export function SearchResults({ results, isLoading }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-emerald-400 font-mono text-sm animate-pulse-subtle">
          Searching...
        </div>
        <div className="text-slate-400 font-sans text-sm mt-2">
          Finding the most relevant resources for you
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 font-mono text-sm mb-2">
          No results found
        </div>
        <div className="text-slate-400 font-sans text-sm">
          Try adjusting your search query or explore our trending resources
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-emerald-400 font-mono text-sm mb-4 border-b border-slate-700 pb-2">
        Found {results.length} results
      </div>
      
      {results.map((result) => (
        <SearchResultCard key={result.id} result={result} />
      ))}
    </div>
  )
}
