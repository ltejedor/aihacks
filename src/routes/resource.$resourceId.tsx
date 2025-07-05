import { createFileRoute } from '@tanstack/react-router'
import { notFound } from '@tanstack/react-router'
import { getResourceById } from '../utils/search'

export const Route = createFileRoute('/resource/$resourceId')({
  loader: async ({ params }) => {
    const resource = await getResourceById({ data: params.resourceId })
    if (!resource) {
      throw notFound()
    }
    return { resource }
  },
  component: ResourcePage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-hacker-bg p-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="text-hacker-red font-mono text-xl mb-4">
          Resource not found
        </div>
        <div className="text-hacker-text-dim font-mono text-sm">
          The resource you're looking for doesn't exist or has been removed.
        </div>
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

function ResourcePage() {
  const { resource } = Route.useLoaderData()
  const links = extractLinks(resource.content)
  
  return (
    <div className="min-h-screen bg-hacker-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <div className="text-hacker-green font-mono text-xs mb-2">
              [RESOURCE_ID: {resource.metadata.resource_id}]
            </div>
            <h1 className="text-3xl md:text-4xl hacker-title text-hacker-green mb-4 leading-tight">
              {resource.metadata.title}
            </h1>
            
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex flex-wrap gap-2">
                {resource.metadata.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="inline-block bg-hacker-bg border border-hacker-green text-hacker-green text-xs px-2 py-1 font-mono uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-hacker-cyan">
                  ↑ {resource.metadata.reaction_count}
                </span>
                <span className="text-hacker-text">
                  ★ {resource.metadata.evergreen_rating}
                </span>
                <span className="text-hacker-text-dim">
                  {new Date(resource.metadata.date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-hacker-bg-secondary border border-hacker-border rounded-none mb-8 p-6">
            <div className="text-hacker-text font-mono text-sm leading-relaxed">
              {formatContentWithLinks(resource.content)}
            </div>
          </div>

          {/* Links Section */}
          {links.length > 0 && (
            <div className="bg-hacker-bg-tertiary border border-hacker-border rounded-none p-6">
              <h2 className="hacker-title text-lg mb-4">
                Documentation Links ({links.length})
              </h2>
              <div className="grid gap-3">
                {links.map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-hacker-bg-secondary border border-hacker-border hover:border-hacker-green transition-colors"
                  >
                    <span className="text-hacker-cyan font-mono">→</span>
                    <span className="hacker-link text-sm break-all">
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
              className="hacker-link hover:text-hacker-green font-mono text-sm"
            >
              ← Back to Search
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 