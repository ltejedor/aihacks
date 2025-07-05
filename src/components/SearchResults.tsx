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
              className="hacker-link hover:text-hacker-green break-all block"
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
    <div className="hacker-card rounded-none mb-6 overflow-hidden">
      {/* Header - Separated Title Section */}
      <div className="bg-hacker-bg-tertiary border-b border-hacker-border p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="text-hacker-green font-mono text-xs mb-1">
              [RESOURCE_ID: {result.metadata.resource_id}]
            </div>
            <h3 className="text-xl md:text-2xl hacker-title text-hacker-green mb-2 leading-tight">
              {result.metadata.title}
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono ml-4">
            <span className="flex items-center gap-1 text-hacker-cyan">
              <span>↑</span>
              <span>{result.metadata.reaction_count}</span>
            </span>
            <span className="flex items-center gap-1 text-hacker-text">
              <span>★</span>
              <span>{result.metadata.evergreen_rating}</span>
            </span>
          </div>
        </div>
        
        {/* Metadata */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-wrap gap-2">
            {result.metadata.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-block bg-hacker-bg border border-hacker-green text-hacker-green text-xs px-2 py-1 font-mono uppercase"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="text-xs font-mono text-hacker-text-dim">
            {new Date(result.metadata.date).toLocaleDateString()}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hacker-link hover:text-hacker-green"
          >
            [{isExpanded ? 'COLLAPSE' : 'EXPAND'}]
          </button>
          <button
            onClick={() => copyToClipboard(generateShareableLink(result.metadata.resource_id))}
            className="hacker-link hover:text-hacker-green"
          >
            [COPY_LINK]
          </button>
          <a
            href={generateShareableLink(result.metadata.resource_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="hacker-link hover:text-hacker-green"
          >
            [OPEN_RESOURCE]
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isExpanded ? (
          <div className="space-y-4">
            <div className="text-hacker-text font-mono text-sm leading-relaxed">
              {formatContentWithLinks(result.content)}
            </div>
            
            {/* Links section */}
            {hasLinks && (
              <div className="border-t border-hacker-border pt-4">
                <h4 className="hacker-title text-sm mb-3">
                  Documentation Links ({links.length})
                </h4>
                <div className="grid gap-2">
                  {links.map((link, index) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-hacker-bg-secondary border border-hacker-border hover:border-hacker-green transition-colors"
                    >
                      <span className="text-hacker-cyan font-mono">→</span>
                      <span className="hacker-link text-xs break-all">
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
            <div className="text-hacker-text font-mono text-sm leading-relaxed">
              {isLongContent ? (
                <div>
                  <p className="mb-2">{result.content.substring(0, 300)}...</p>
                  <button
                    onClick={() => setShowFullContent(!showFullContent)}
                    className="hacker-link text-xs hover:text-hacker-green"
                  >
                    [{showFullContent ? 'HIDE_PREVIEW' : 'SHOW_PREVIEW'}]
                  </button>
                  {showFullContent && (
                    <div className="mt-3 text-hacker-text font-mono text-sm leading-relaxed">
                      {formatContentWithLinks(result.content)}
                    </div>
                  )}
                </div>
              ) : (
                formatContentWithLinks(result.content)
              )}
            </div>
            
            {/* Links preview - NOW ALWAYS VISIBLE */}
            {hasLinks && (
              <div className="border-t border-hacker-border pt-3">
                <div className="mb-2">
                  <span className="hacker-title text-xs">Links:</span>
                </div>
                <div className="grid gap-1">
                  {links.slice(0, 3).map((link, index) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs hacker-link hover:text-hacker-green"
                    >
                      <span className="text-hacker-cyan">→</span>
                      <span className="truncate">{link}</span>
                    </a>
                  ))}
                  {links.length > 3 && (
                    <div className="text-xs text-hacker-text-dim font-mono">
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
          <div className="mt-4 pt-3 border-t border-hacker-border text-xs font-mono text-hacker-text-darker">
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
        <div className="text-hacker-green font-mono text-sm animate-pulse">
          Searching...
        </div>
        <div className="text-hacker-text-dim font-mono text-xs mt-2">
          Please wait while we find the most relevant resources.
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-hacker-red font-mono text-sm mb-2">
          No results found
        </div>
        <div className="text-hacker-text-dim font-mono text-xs">
          Try a different search query.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-hacker-green font-mono text-sm mb-4 border-b border-hacker-border pb-2">
        Found {results.length} results
      </div>
      
      {results.map((result) => (
        <SearchResultCard key={result.id} result={result} />
      ))}
    </div>
  )
}
