import { createFileRoute } from '@tanstack/react-router'
import { notFound } from '@tanstack/react-router'
import { getResourceById } from '../utils/search'
import { seo } from '../utils/seo'

export const Route = createFileRoute('/resource/$resourceId')({
  loader: async ({ params }) => {
    const resource = await getResourceById({ data: params.resourceId })
    if (!resource) {
      throw notFound()
    }
    return { resource }
  },
  head: (ctx: any) => {
    const { loaderData } = ctx
    if (!loaderData?.resource) {
      return {
        meta: seo({
          title: 'Resource not found',
          description: 'The resource you are looking for could not be found.',
        }),
      }
    }
    
    const { resource } = loaderData
    const description = createResourceDescription(resource.content)
    const keywords = resource.metadata.tags.join(', ')
    
    return {
      meta: seo({
        title: resource.metadata.title,
        description,
        keywords,
      }),
    }
  },
  component: ResourcePage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="text-red-500 font-mono text-xl mb-4">
          Resource not found
        </div>
        <div className="text-slate-400 font-sans text-sm mb-6">
          The resource you're looking for doesn't exist or has been removed.
        </div>
        <a
          href="/"
          className="hacker-button inline-block py-3 px-6"
        >
          Return Home
        </a>
      </div>
    </div>
  ),
})

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

function createResourceDescription(content: string, maxLength: number = 160): string {
  // Remove URLs and excessive whitespace from content for description
  const cleanContent = content
    .replace(/https?:\/\/[^\s\n]+/g, '') // Remove URLs
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
  
  if (cleanContent.length <= maxLength) {
    return cleanContent
  }
  
  // Find the last complete sentence within the limit
  const truncated = cleanContent.substring(0, maxLength)
  const lastSentence = truncated.lastIndexOf('.')
  const lastSpace = truncated.lastIndexOf(' ')
  
  if (lastSentence > maxLength * 0.6) {
    return truncated.substring(0, lastSentence + 1)
  } else if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...'
  } else {
    return truncated + '...'
  }
}

function ResourcePage() {
  const { resource } = Route.useLoaderData()
  const links = extractLinks(resource.content)
  
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <div className="text-slate-500 font-mono text-xs mb-2">
              ID: {resource.metadata.resource_id}
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold text-emerald-400 mb-4 leading-tight">
              {resource.metadata.title}
            </h1>
            
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex flex-wrap gap-2">
                {resource.metadata.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="inline-block bg-slate-700 text-emerald-400 text-xs px-2 py-1 font-mono rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-blue-400">
                  ↑ {resource.metadata.reaction_count}
                </span>
                <span className="text-slate-400">
                  ★ {resource.metadata.evergreen_rating}
                </span>
                <span className="text-slate-400">
                  {new Date(resource.metadata.date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg mb-8 p-6">
            <div className="text-slate-100 font-sans text-sm leading-relaxed">
              {formatContentWithLinks(resource.content)}
            </div>
          </div>

          {/* Links Section */}
          {links.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
              <h2 className="text-emerald-400 font-semibold text-lg mb-4">
                Documentation Links ({links.length})
              </h2>
              <div className="grid gap-3">
                {links.map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-slate-700 border border-slate-600 hover:border-emerald-500 transition-colors rounded-md"
                  >
                    <span className="text-blue-400 font-mono">→</span>
                    <span className="text-blue-400 hover:text-emerald-400 text-sm break-all transition-colors">
                      {link}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Back Link */}
          <div className="mt-8 text-center">
            <a
              href="/"
              className="text-blue-400 hover:text-emerald-400 font-mono text-sm transition-colors"
            >
              ← Back to Search
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 
