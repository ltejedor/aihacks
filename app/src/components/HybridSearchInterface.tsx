import { useState, useCallback, useEffect, useRef } from 'react'
import { SearchResult, searchResources } from '../utils/search'
import { chatWithAI } from '../utils/chat-server'
import { SearchResults } from './SearchResults'

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

interface HybridSearchInterfaceProps {
  initialQuery?: string
}

export function HybridSearchInterface({ initialQuery }: HybridSearchInterfaceProps) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isAgentThinking, setIsAgentThinking] = useState(false)
  const [currentQuery, setCurrentQuery] = useState(initialQuery || '')
  const [agentResources, setAgentResources] = useState<SearchResult[]>([])
  
  const messagesRef = useRef<Message[]>([])
  
  // Update ref whenever messages change
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const handleAgentSearch = useCallback(async (query: string, isInitialSearch = false, currentMessages: Message[] = []) => {
    setIsAgentThinking(true)
    
    const searchMessage = isInitialSearch 
      ? `I'm searching for: "${query}". Please find relevant AI resources and explain why they're useful.`
      : query

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: searchMessage,
      createdAt: new Date()
    }
    
    if (!isInitialSearch) {
      setMessages(prev => [...prev, userMessage])
    }
    
    try {
      const response = await chatWithAI({
        data: {
          messages: [
            ...currentMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: searchMessage }
          ]
        }
      })
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || 'Search completed',
        createdAt: new Date(),
        toolInvocations: []
      }
      
      // Process tool results and update agent resources
      if (response.toolCalls && response.toolResults) {
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
        
        // Extract resources from tool results
        const newResources: SearchResult[] = []
        toolInvocations.forEach(tool => {
          if ((tool.toolName === 'semantic_search' || tool.toolName === 'trending_resources') && 
              Array.isArray(tool.result)) {
            newResources.push(...tool.result)
          } else if (tool.toolName === 'get_resource' && tool.result) {
            newResources.push(tool.result)
          }
        })
        
        if (newResources.length > 0) {
          setAgentResources(newResources)
          // Merge with existing search results if it's an initial search
          if (isInitialSearch) {
            setSearchResults(prev => {
              const combined = [...prev, ...newResources]
              // Remove duplicates based on resource_id
              const unique = combined.filter((resource, index, self) => 
                index === self.findIndex(r => r.metadata.resource_id === resource.metadata.resource_id)
              )
              return unique
            })
          }
        }
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Agent search error:', error)
    } finally {
      setIsAgentThinking(false)
    }
  }, [])

  const handleInitialSearch = useCallback(async (query: string) => {
    setIsSearching(true)
    setCurrentQuery(query)
    
    try {
      // Perform direct search for immediate results
      const directResults = await searchResources({ data: query })
      setSearchResults(directResults)
      
      // Also trigger agent search for enhanced results with empty messages array
      await handleAgentSearch(query, true, [])
    } catch (error) {
      console.error('Initial search error:', error)
    } finally {
      setIsSearching(false)
    }
  }, [handleAgentSearch])

  // Handle initial search query
  useEffect(() => {
    if (initialQuery) {
      handleInitialSearch(initialQuery)
    }
  }, [initialQuery, handleInitialSearch])

  const handleChatSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isAgentThinking) return
    
    const query = input.trim()
    setInput('')
    
    // Use the ref to get current messages
    await handleAgentSearch(query, false, messagesRef.current)
  }, [input, isAgentThinking, handleAgentSearch])

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Search Results Area */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                    <span>🔍</span>
                    <span>Search Results</span>
                  </h2>
                  {currentQuery && (
                    <div className="text-slate-400 font-mono text-sm">
                      Query: "{currentQuery}"
                    </div>
                  )}
                </div>
                
                {/* Search Results */}
                <div className="transition-all duration-500 ease-in-out">
                  <SearchResults results={searchResults} isLoading={isSearching} />
                </div>
                
                {/* Agent-discovered Resources */}
                {agentResources.length > 0 && (
                  <div className="mt-8 animate-fadeIn">
                    <div className="text-blue-400 font-mono text-sm mb-4 flex items-center gap-2">
                      <span>🤖</span>
                      <span>Agent Discoveries ({agentResources.length})</span>
                    </div>
                    <div className="border-l-2 border-blue-400 pl-4">
                      <SearchResults results={agentResources} isLoading={false} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Agent Chat Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
                  <h3 className="text-emerald-400 font-mono text-sm mb-4 flex items-center gap-2">
                    <span>🤖</span>
                    <span>AI Agent</span>
                  </h3>
                  
                  {/* Agent Messages */}
                  <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                    {messages.length === 0 ? (
                      <div className="text-slate-400 font-mono text-xs">
                        <div className="flex items-center gap-2 mb-2">
                          <span>🤖</span>
                          <span>Agent is analyzing your search and finding relevant resources...</span>
                        </div>
                        <div className="text-slate-500 text-xs mt-2">
                          The agent will explain its reasoning and tool choices in real-time.
                        </div>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg text-sm ${
                            message.role === 'user'
                              ? 'bg-slate-700 border border-slate-600'
                              : 'bg-slate-900 border border-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-emerald-400 font-mono text-xs">
                              {message.role === 'user' ? '👤 You' : '🤖 Agent'}
                            </span>
                            <span className="text-slate-500 font-mono text-xs">
                              {message.createdAt.toLocaleTimeString()}
                            </span>
                          </div>
                          
                          <div className="text-slate-100 text-xs leading-relaxed">
                            {message.content}
                          </div>
                          
                          {/* Enhanced Tool Invocations */}
                          {message.toolInvocations && message.toolInvocations.length > 0 && (
                            <div className="mt-3 border-t border-slate-700 pt-3">
                              <div className="text-blue-400 font-mono text-xs mb-2 flex items-center gap-1">
                                <span>🔧</span>
                                <span>Decision Process ({message.toolInvocations.length} tools)</span>
                              </div>
                              {message.toolInvocations.map((tool, index) => (
                                <div key={index} className="mb-2 bg-slate-800 rounded p-2 border border-slate-700">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="text-emerald-400 font-mono text-xs flex items-center gap-1">
                                      <span>→</span> 
                                      <span>{tool.toolName}</span>
                                      {tool.toolName === 'semantic_search' && <span>🔍</span>}
                                      {tool.toolName === 'trending_resources' && <span>📈</span>}
                                      {tool.toolName === 'get_resource' && <span>📄</span>}
                                      {tool.toolName === 'reasoning' && <span>🧠</span>}
                                    </div>
                                    <div className="text-slate-500 font-mono text-xs">
                                      {tool.state === 'result' && '✅'}
                                    </div>
                                  </div>
                                  
                                  {/* Tool Strategy */}
                                  <div className="text-slate-400 font-mono text-xs mb-1">
                                    {tool.toolName === 'semantic_search' && 
                                      `Finding similar content for: "${tool.args?.query}"`}
                                    {tool.toolName === 'trending_resources' && 
                                      `Analyzing trending patterns (${tool.args?.limit || 15} resources)`}
                                    {tool.toolName === 'get_resource' && 
                                      `Retrieving resource: ${tool.args?.resourceId}`}
                                    {tool.toolName === 'reasoning' && 
                                      `Analyzing: "${tool.args?.thinking?.substring(0, 30)}..."`}
                                  </div>
                                  
                                  {tool.result && Array.isArray(tool.result) && (
                                    <div className="text-slate-400 font-mono text-xs">
                                      <span className="text-emerald-400">Found:</span> {tool.result.length} resources
                                      {tool.toolName === 'semantic_search' && tool.result[0]?.similarity && (
                                        <span className="ml-2">
                                          (Top match: {(tool.result[0].similarity * 100).toFixed(1)}%)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {tool.result && tool.toolName === 'reasoning' && (
                                    <div className="text-slate-400 font-mono text-xs">
                                      <span className="text-purple-400">🧠 Reasoning:</span> {tool.result.confidence ? `${(tool.result.confidence * 100).toFixed(0)}% confidence` : 'Analysis complete'}
                                      {tool.result.insights && tool.result.insights.length > 0 && (
                                        <span className="ml-2">({tool.result.insights.length} insights)</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    
                    {isAgentThinking && (
                      <div className="p-3 bg-slate-900 border border-slate-600 rounded-lg">
                        <div className="text-slate-400 font-mono text-xs animate-pulse flex items-center gap-2 mb-2">
                          <span>🤖</span>
                          <span>Agent is thinking...</span>
                        </div>
                        <div className="text-slate-500 font-mono text-xs">
                          • Analyzing your request<br/>
                          • Selecting appropriate tools<br/>
                          • Preparing search strategy
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Chat Input */}
                  <form onSubmit={handleChatSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask the agent..."
                      className="flex-1 hacker-input text-xs py-2 px-3"
                      disabled={isAgentThinking}
                    />
                    <button
                      type="submit"
                      disabled={isAgentThinking || !input.trim()}
                      className="hacker-button py-2 px-3 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
