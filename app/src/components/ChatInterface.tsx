import { useState, useCallback } from 'react'
import { SearchResult } from '../utils/search'
import { chatWithAI } from '../utils/chat-server'

// Custom message types
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
  toolInvocations?: ToolInvocation[]
}

interface ToolInvocation {
  toolName: string
  args: Record<string, any>
  state: 'call' | 'result' | 'partial-call'
  result?: any
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

function ResourceCard({ resource }: { resource: SearchResult }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const generateShareableLink = (resourceId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/resource/${resourceId}`
    }
    return `/resource/${resourceId}`
  }
  
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-emerald-400 font-semibold text-sm">
          {resource.metadata.title}
        </h4>
        <div className="flex items-center gap-2 text-xs font-mono ml-4">
          <span className="flex items-center gap-1 text-blue-400">
            <span>↑</span>
            <span>{resource.metadata.reaction_count}</span>
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span>★</span>
            <span>{resource.metadata.evergreen_rating}</span>
          </span>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1 mb-2">
        {resource.metadata.tags.map((tag, index) => (
          <span
            key={index}
            className="inline-block bg-slate-700 text-emerald-400 text-xs px-2 py-1 font-mono rounded-md"
          >
            {tag}
          </span>
        ))}
      </div>
      
      <div className="text-slate-300 text-sm mb-2">
        {isExpanded ? (
          formatContentWithLinks(resource.content)
        ) : (
          <span>{resource.content.substring(0, 200)}...</span>
        )}
      </div>
      
      <div className="flex items-center gap-3 text-xs font-mono">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-400 hover:text-emerald-400 transition-colors"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
        <a
          href={generateShareableLink(resource.metadata.resource_id)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-emerald-400 transition-colors"
        >
          Open Resource
        </a>
      </div>
      
      {resource.similarity && (
        <div className="mt-2 pt-2 border-t border-slate-700 text-xs font-mono text-slate-500">
          Similarity: {(resource.similarity * 100).toFixed(1)}%
        </div>
      )}
    </div>
  )
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('📝 Form submitted with input:', input)
    
    if (!input.trim() || isLoading) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      createdAt: new Date()
    }
    
    const currentInput = input
    setInput('')
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🚀 Calling server function with message:', currentInput)
      
      // Call server function
      const response = await chatWithAI({
        data: {
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: currentInput }
          ]
        }
      })
      
      console.log('📥 Server response received:', response)
      console.log('📥 Response type:', typeof response)
      console.log('📥 Response keys:', Object.keys(response))
      console.log('📥 Response text:', response.text)
      console.log('📥 Response text type:', typeof response.text)
      
      // Create assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || 'No response received',
        createdAt: new Date(),
        toolInvocations: []
      }
      
      console.log('👤 Created assistant message:', assistantMessage)
      
      // Process tool calls and results
      if (response.toolCalls && response.toolResults) {
        console.log('🔧 Processing tool calls:', response.toolCalls)
        console.log('🔧 Processing tool results:', response.toolResults)
        
        const toolInvocations: ToolInvocation[] = response.toolCalls.map((call, index) => {
          const result = response.toolResults[index]
          return {
            toolName: call.toolName,
            args: call.args,
            state: 'result' as const,
            result: result?.result
          }
        })
        
        assistantMessage.toolInvocations = toolInvocations
        console.log('🔧 Final tool invocations:', toolInvocations)
      } else {
        console.log('🔧 No tool calls or results to process')
      }
      
      console.log('📝 Adding assistant message to state')
      setMessages(prev => [...prev, assistantMessage])
      console.log('✅ Message processing completed')
      
    } catch (error) {
      console.error('❌ Chat error:', error)
      const errorObj = error as Error
      console.error('❌ Error details:', {
        name: errorObj.name,
        message: errorObj.message,
        stack: errorObj.stack
      })
      setError(errorObj)
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('✏️ Input changed:', e.target.value)
    setInput(e.target.value)
  }

  // Log messages changes
  console.log('🔄 Messages updated:', messages.length, messages)
  console.log('⚡ Loading state:', isLoading)
  console.log('❌ Error state:', error)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Chat Messages */}
      <div className="space-y-4 mb-6 min-h-[400px]">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-emerald-400 font-mono text-lg mb-2">
              AI Resource Search Agent
            </div>
            <div className="text-slate-400 font-sans text-sm mb-4">
              Ask me about AI resources, tools, or trending content
            </div>
            <div className="text-slate-500 font-mono text-xs">
              Examples: "What are the best AI agent frameworks?" • "Show me trending AI tools" • "Find resources about LangChain"
            </div>
          </div>
        ) : (
          messages.map((message) => {
            // Log each message as it renders
            console.log('🎨 Rendering message:', message)
            
            return (
              <div
                key={message.id}
                className={`p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-slate-800 border border-slate-700'
                    : 'bg-slate-900 border border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-400 font-mono text-sm">
                    {message.role === 'user' ? 'You' : 'Agent'}
                  </span>
                  <span className="text-slate-500 font-mono text-xs">
                    {message.createdAt.toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="text-slate-100 text-sm leading-relaxed">
                  {formatContentWithLinks(message.content)}
                </div>
                
                {/* Tool Invocations */}
                {message.toolInvocations && message.toolInvocations.length > 0 && (
                  <div className="mt-4 border-t border-slate-700 pt-4">
                    <div className="text-blue-400 font-mono text-xs mb-3 flex items-center gap-2">
                      <span>🔧</span>
                      <span>Agent Decision Process ({message.toolInvocations.length} tools used)</span>
                    </div>
                    {message.toolInvocations.map((tool, index) => {
                      // Log tool invocations
                      console.log('🔧 Tool invocation:', tool)
                      
                      return (
                        <div key={index} className="mb-4 bg-slate-800 rounded-lg p-3 border border-slate-600">
                          {/* Tool Header with Decision Context */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="text-emerald-400 font-mono text-xs">
                                <span>→</span> {tool.toolName}
                              </div>
                              <div className="text-slate-400 font-mono text-xs">
                                {tool.toolName === 'semantic_search' && '🔍 Semantic Search'}
                                {tool.toolName === 'trending_resources' && '📈 Trending Analysis'}
                                {tool.toolName === 'get_resource' && '📄 Resource Retrieval'}
                                {tool.toolName === 'reasoning' && '🧠 Agent Reasoning'}
                              </div>
                            </div>
                            <div className="text-slate-500 font-mono text-xs">
                              {tool.state === 'call' && '⏳ Executing...'}
                              {tool.state === 'result' && '✅ Completed'}
                              {tool.state === 'partial-call' && '🔄 Processing...'}
                            </div>
                          </div>
                          
                          {/* Tool Purpose & Strategy */}
                          <div className="mb-3 p-2 bg-slate-900 rounded border-l-2 border-blue-400">
                            <div className="text-blue-400 font-mono text-xs mb-1">Strategy & Purpose:</div>
                            <div className="text-slate-300 text-xs">
                              {tool.toolName === 'semantic_search' && 
                                `Using semantic similarity to find resources related to: "${tool.args?.query}"`}
                              {tool.toolName === 'trending_resources' && 
                                `Analyzing trending resources based on reactions and evergreen ratings (limit: ${tool.args?.limit || 15})`}
                              {tool.toolName === 'get_resource' && 
                                `Retrieving specific resource with ID: ${tool.args?.resourceId}`}
                              {tool.toolName === 'reasoning' && 
                                `Analyzing thought process and decision-making: "${tool.args?.thinking?.substring(0, 50)}..."`}
                            </div>
                          </div>
                          
                          {/* Tool Arguments */}
                          {tool.args && Object.keys(tool.args).length > 0 && (
                            <div className="mb-3">
                              <div className="text-slate-500 font-mono text-xs mb-1">Parameters:</div>
                              <div className="text-slate-300 font-mono text-xs bg-slate-900 rounded p-2">
                                {JSON.stringify(tool.args, null, 2)}
                              </div>
                            </div>
                          )}
                          
                          {/* Tool Results with Analysis */}
                          {tool.state === 'result' && tool.result && (
                            <div className="ml-2">
                              <div className="text-slate-500 font-mono text-xs mb-2 flex items-center gap-2">
                                <span>📊</span>
                                <span>Results & Analysis:</span>
                              </div>
                              {tool.toolName === 'reasoning' && tool.result ? (
                                <div className="space-y-2">
                                  <div className="p-2 bg-slate-900 rounded border-l-2 border-purple-400 mb-3">
                                    <div className="text-purple-400 font-mono text-xs mb-1">
                                      🧠 Agent Reasoning:
                                    </div>
                                    <div className="text-slate-300 text-xs">
                                      Confidence: {((tool.result.confidence || 0.8) * 100).toFixed(0)}%
                                    </div>
                                  </div>
                                  
                                  {/* Reasoning Content */}
                                  <div className="bg-slate-900 rounded p-2 border border-purple-400/30">
                                    <div className="text-slate-300 text-xs whitespace-pre-wrap mb-2">
                                      {tool.result.reasoning}
                                    </div>
                                    
                                    {/* Insights */}
                                    {tool.result.insights && tool.result.insights.length > 0 && (
                                      <div className="mb-2">
                                        <div className="text-blue-400 font-mono text-xs mb-1">💡 Insights:</div>
                                        <ul className="text-slate-300 text-xs space-y-1">
                                          {tool.result.insights.map((insight: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-1">
                                              <span className="text-blue-400 mt-0.5">•</span>
                                              <span>{insight}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    
                                    {/* Next Steps */}
                                    {tool.result.next_steps && tool.result.next_steps.length > 0 && (
                                      <div>
                                        <div className="text-emerald-400 font-mono text-xs mb-1">🎯 Next Steps:</div>
                                        <ul className="text-slate-300 text-xs space-y-1">
                                          {tool.result.next_steps.map((step: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-1">
                                              <span className="text-emerald-400 mt-0.5">→</span>
                                              <span>{step}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : tool.toolName === 'semantic_search' || 
                               tool.toolName === 'trending_resources' ? (
                                <div className="space-y-2">
                                  {Array.isArray(tool.result) && tool.result.length > 0 ? (
                                    <>
                                      {/* Results Summary */}
                                      <div className="p-2 bg-slate-900 rounded border-l-2 border-emerald-400 mb-3">
                                        <div className="text-emerald-400 font-mono text-xs mb-1">
                                          Analysis Summary:
                                        </div>
                                        <div className="text-slate-300 text-xs">
                                          Found {tool.result.length} resources.
                                          {tool.toolName === 'semantic_search' && tool.result[0]?.similarity && (
                                            <span> Top similarity: {(tool.result[0].similarity * 100).toFixed(1)}%</span>
                                          )}
                                          {tool.toolName === 'trending_resources' && (
                                            <span> Ranked by trending score (reactions + evergreen rating / age)</span>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Resource Cards */}
                                      {tool.result.map((resource: SearchResult, idx: number) => (
                                        <div key={idx} className="relative">
                                          <ResourceCard resource={resource} />
                                          {/* Relevance Indicator */}
                                          {tool.toolName === 'semantic_search' && resource.similarity && (
                                            <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded font-mono">
                                              {(resource.similarity * 100).toFixed(1)}% match
                                            </div>
                                          )}
                                          {tool.toolName === 'trending_resources' && idx < 3 && (
                                            <div className="absolute top-2 right-2 bg-orange-600 text-white text-xs px-2 py-1 rounded font-mono">
                                              #{idx + 1} trending
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </>
                                  ) : (
                                    <div className="text-slate-400 font-mono text-xs p-2 bg-slate-900 rounded">
                                      No resources found. This might indicate:
                                      <ul className="list-disc list-inside mt-1 text-xs">
                                        <li>The query is too specific or uses uncommon terms</li>
                                        <li>The resource database may not contain relevant content</li>
                                        <li>Consider trying broader search terms or trending resources</li>
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ) : tool.toolName === 'get_resource' && tool.result ? (
                                <div className="space-y-2">
                                  <div className="p-2 bg-slate-900 rounded border-l-2 border-emerald-400 mb-3">
                                    <div className="text-emerald-400 font-mono text-xs mb-1">
                                      Resource Retrieved:
                                    </div>
                                    <div className="text-slate-300 text-xs">
                                      Successfully found specific resource: {tool.result.metadata?.title || 'Unknown'}
                                    </div>
                                  </div>
                                  <ResourceCard resource={tool.result as SearchResult} />
                                </div>
                              ) : (
                                <div className="text-slate-300 text-xs font-mono bg-slate-900 rounded p-2">
                                  {typeof tool.result === 'string' 
                                    ? tool.result 
                                    : JSON.stringify(tool.result, null, 2)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
        
        {isLoading && (
          <div className="p-4 bg-slate-900 border border-slate-600 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-emerald-400 font-mono text-sm">Agent</span>
              <span className="text-slate-500 font-mono text-xs">thinking...</span>
            </div>
            <div className="text-slate-400 font-mono text-sm animate-pulse flex items-center gap-2">
              <span>🤖</span>
              <span>Processing your request and selecting appropriate tools...</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-900 border border-red-600 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-400 font-mono text-sm">Error</span>
            </div>
            <div className="text-red-300 text-sm">
              {error.message || 'An error occurred'}
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400 font-mono text-sm">
            $
          </div>
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about AI resources, tools, or trending content..."
            className="w-full hacker-input pl-8 pr-4 py-3 placeholder-slate-500"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="hacker-button py-3 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => console.log('🔘 Submit button clicked')}
        >
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>
      
      {/* Technical Info Footer */}
      <div className="mt-4 text-center text-slate-500 font-mono text-xs">
        Agent: Claude 3.5 Sonnet • Tools: semantic_search, trending_resources, get_resource
      </div>
    </div>
  )
}
