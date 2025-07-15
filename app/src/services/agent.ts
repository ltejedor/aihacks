import { getEnabledTools, executeTool, getToolCapabilities, ToolResult } from '../tools'
import { SearchResult } from '../utils/search'

// Agent response interface
export interface AgentResponse {
  query: string
  reasoning: string
  toolsUsed: string[]
  results: SearchResult[]
  executionTime: number
  metadata: {
    toolResults: ToolResult[]
    suggestedNextActions?: string[]
  }
}

// Agent service class
export class AgentService {
  private static instance: AgentService
  private mastra: any = null
  private agent: any = null
  private initializationPromise: Promise<void> | null = null
  
  private constructor() {
    this.initializationPromise = this.initializeMastra()
  }
  
  private async initializeMastra(): Promise<void> {
    // Only initialize Mastra in server environment
    if (typeof window !== 'undefined') {
      console.log('🌐 Browser environment detected, skipping Mastra initialization')
      this.mastra = null
      return
    }
    
    try {
      const { Mastra } = await import('@mastra/core')
      const { Agent } = await import('@mastra/core/agent')
      const { anthropic } = await import('@ai-sdk/anthropic')
      
      this.mastra = new Mastra({})
      
      // Create agent with Anthropic model
      this.agent = new Agent({
        name: 'AI Resource Search Agent',
        instructions: `You are an AI search agent that helps users find relevant AI resources. Your goal is to analyze user queries and select the most appropriate tools to provide helpful results.

Available tools will be provided to you. Choose the right tools and parameters based on the user's needs.

Be concise and helpful in your responses.`,
        model: anthropic('claude-3-7-sonnet-20250219'),
      })
      
      console.log('✅ Mastra and Anthropic agent initialized successfully')
    } catch (error) {
      console.warn('⚠️  Mastra initialization failed, using fallback:', error)
      this.mastra = null
      this.agent = null
    }
  }
  
  static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService()
    }
    return AgentService.instance
  }
  
  /**
   * Process a user query using the agent
   */
  async processQuery(query: string): Promise<AgentResponse> {
    const startTime = Date.now()
    const toolResults: ToolResult[] = []
    
    try {
      // Wait for initialization to complete
      if (this.initializationPromise) {
        await this.initializationPromise
      }
      
      // Get available tools and their capabilities
      const availableTools = getEnabledTools()
      const toolCapabilities = getToolCapabilities()
      
      // If we have the real Mastra agent, use it
      if (this.agent) {
        console.log('🤖 Using Anthropic Claude agent')
        const results = await this.useRealAgent(query, availableTools, toolResults)
        return {
          query,
          reasoning: `Used Anthropic Claude to analyze your query and select appropriate tools.`,
          toolsUsed: toolResults.map(t => t.toolId),
          results,
          executionTime: Date.now() - startTime,
          metadata: {
            toolResults,
          }
        }
      }
      
      // Fallback to simple logic if Mastra failed to initialize
      console.log('🔄 Using fallback agent logic')
      const agentDecision = await this.makeDecision(query, availableTools, toolCapabilities)
      
      // Execute the agent's chosen tools
      const results: SearchResult[] = []
      
      for (const toolExecution of agentDecision.toolExecutions) {
        const toolResult = await executeTool(toolExecution.toolId, toolExecution.parameters)
        toolResults.push(toolResult)
        
        if (toolResult.success && toolResult.data?.results) {
          results.push(...toolResult.data.results)
        }
      }
      
      return {
        query,
        reasoning: agentDecision.reasoning,
        toolsUsed: agentDecision.toolExecutions.map(t => t.toolId),
        results,
        executionTime: Date.now() - startTime,
        metadata: {
          toolResults,
        }
      }
      
    } catch (error) {
      return {
        query,
        reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        toolsUsed: [],
        results: [],
        executionTime: Date.now() - startTime,
        metadata: {
          toolResults,
        }
      }
    }
  }
  
  /**
   * Use the real Mastra agent with Claude
   */
  private async useRealAgent(query: string, availableTools: any[], toolResults: ToolResult[]): Promise<SearchResult[]> {
    // Convert our tools to Mastra format
    const mastraTools = this.convertToMastraTools(availableTools)
    
    // Use the agent to process the query
    const response = await this.agent.stream(query, {
      toolsets: { search: mastraTools }
    })
    
    const results: SearchResult[] = []
    
    // Process the agent's response
    for await (const part of response.fullStream) {
      if (part.type === 'tool-call') {
        // Execute the tool call
        const toolResult = await executeTool(part.toolName, part.args)
        toolResults.push(toolResult)
        
        if (toolResult.success && toolResult.data?.results) {
          results.push(...toolResult.data.results)
        }
      }
    }
    
    return results
  }
  
  /**
   * Convert our tools to Mastra format
   */
  private convertToMastraTools(availableTools: any[]): any {
    const tools: any = {}
    
    for (const tool of availableTools) {
      tools[tool.id] = {
        description: tool.description,
        parameters: tool.schema._def.schema(),
        execute: async (params: any) => {
          const result = await executeTool(tool.id, params)
          return result.data
        }
      }
    }
    
    return tools
  }
  
  /**
   * Fallback decision making when Mastra is not available
   */
  private async makeDecision(query: string, availableTools: any[], toolCapabilities: string): Promise<{
    reasoning: string
    toolExecutions: Array<{ toolId: string, parameters: any }>
  }> {
    // Simple fallback: use semantic search with minimal assumptions
    return {
      reasoning: `Using fallback logic to search for AI resources related to your query.`,
      toolExecutions: [{
        toolId: 'semantic-search',
        parameters: { query }
      }]
    }
  }
}

// Export singleton instance
export const agentService = AgentService.getInstance() 