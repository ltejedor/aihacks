import { createServerFn } from '@tanstack/react-start'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export const chatWithAI = createServerFn({ method: 'POST' })
  .validator((data: { messages: ChatMessage[] }) => data)
  .handler(async ({ data }) => {
    console.log('🚀 Chat server function called')
    console.log('📥 Received messages:', data.messages)
    console.log('🔑 ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY)

    try {
      // Create a complete response using generateText instead of streamText
      const result = await generateText({
        model: anthropic('claude-3-5-sonnet-latest'),
        messages: data.messages,
        tools: {
          semantic_search: {
            description: 'Search AI resources using semantic similarity',
            parameters: z.object({
              query: z.string().min(1).describe('The search query to find relevant AI resources')
            }),
            execute: async ({ query }) => {
              console.log('🔍 Semantic search tool called with query:', query)
              try {
                const { semanticSearchTool } = await import('../lib/mastra/tools/semantic-search')
                const result = await semanticSearchTool.execute({ query })
                console.log('🔍 Semantic search tool result:', result)
                return result
              } catch (error) {
                console.error('❌ Semantic search tool error:', error)
                throw error
              }
            }
          },
          trending_resources: {
            description: 'Get trending AI resources based on recency, reactions, and evergreen rating',
            parameters: z.object({
              limit: z.number().min(1).max(50).default(15).describe('Number of trending resources to return')
            }),
            execute: async ({ limit = 15 }) => {
              console.log('📈 Trending resources tool called with limit:', limit)
              try {
                const { trendingResourcesTool } = await import('../lib/mastra/tools/trending-resources')
                const result = await trendingResourcesTool.execute({ limit })
                console.log('📈 Trending resources tool result:', result)
                return result
              } catch (error) {
                console.error('❌ Trending resources tool error:', error)
                throw error
              }
            }
          },
          get_resource: {
            description: 'Get a specific AI resource by its ID',
            parameters: z.object({
              resourceId: z.string().min(1).describe('The unique identifier of the resource to retrieve')
            }),
            execute: async ({ resourceId }) => {
              console.log('📄 Get resource tool called with ID:', resourceId)
              try {
                const { getResourceTool } = await import('../lib/mastra/tools/get-resource')
                const result = await getResourceTool.execute({ resourceId })
                console.log('📄 Get resource tool result:', result)
                return result
              } catch (error) {
                console.error('❌ Get resource tool error:', error)
                throw error
              }
            }
          },
          reasoning: {
            description: 'Articulate thought process, analyze decisions, and explain reasoning to provide transparency',
            parameters: z.object({
              thinking: z.string().min(1).describe('The agent\'s current thought process or analysis'),
              context: z.string().optional().describe('Additional context about the current situation'),
              decision: z.string().optional().describe('The decision being made or approach being taken'),
              rationale: z.string().optional().describe('The reasoning behind the decision')
            }),
            execute: async ({ thinking, context, decision, rationale }) => {
              console.log('🧠 Reasoning tool called with thinking:', thinking)
              try {
                const { reasoningTool } = await import('../lib/mastra/tools/reasoning-tool')
                const result = await reasoningTool.execute({ thinking, context, decision, rationale })
                console.log('🧠 Reasoning tool result:', result)
                return result
              } catch (error) {
                console.error('❌ Reasoning tool error:', error)
                throw error
              }
            }
          }
        },
        system: `You are an AI resource search assistant for AI Hacks, a curated collection of AI resources, tools, and documentation.

Your goal is to help users discover relevant AI resources through natural conversation while being completely transparent about your thought process and decision-making.

CORE PRINCIPLES:
1. THINK OUT LOUD: Always explain your reasoning before taking actions
2. BE SELECTIVE: Don't just use tools blindly - explain why you're choosing specific tools
3. ANALYZE RESULTS: After getting results, explain why they're relevant and how they answer the user's question
4. BE THOUGHTFUL: Consider the user's intent and provide context about your choices
5. USE REASONING: Leverage the reasoning tool to articulate your thought process transparently

AVAILABLE TOOLS:
- reasoning: Articulate your thought process and explain your decision-making transparently
- semantic_search: Find resources based on content similarity to a query
- trending_resources: Get popular and recent content based on reactions and evergreen ratings
- get_resource: Retrieve a specific resource by its ID

DECISION FRAMEWORK:
1. UNDERSTAND: First, analyze what the user is asking for (use reasoning tool to explain)
2. PLAN: Explain which tools you'll use and why (use reasoning tool for transparency)
3. EXECUTE: Use the tools while explaining your approach
4. SYNTHESIZE: Analyze the results and explain their relevance (use reasoning tool for analysis)
5. RECOMMEND: Provide thoughtful recommendations based on your findings

RESPONSE STRUCTURE:
- Start by using the reasoning tool to explain your understanding of the user's request
- Describe your search strategy and tool choices using the reasoning tool
- After each tool use, explain what you found and why it's relevant
- Use the reasoning tool to synthesize findings and provide clear recommendations
- Always explain your reasoning for including or excluding resources

QUALITY GUIDELINES:
- Prioritize resources with high evergreen ratings and reaction counts
- Consider recency for trending topics
- Explain similarity scores and what they mean
- Group related resources and explain connections
- Suggest follow-up searches or related topics when appropriate
- Use the reasoning tool frequently to maintain transparency

TRANSPARENCY REQUIREMENTS:
- Use the reasoning tool at the beginning of each response to explain your approach
- Use the reasoning tool when making decisions about which other tools to use
- Use the reasoning tool to explain why certain results are more relevant than others
- Use the reasoning tool to provide insights about the AI landscape and tool ecosystem

Be conversational, helpful, and transparent. Your goal is not just to find resources, but to help users understand the landscape of AI tools and make informed decisions while showing your complete thought process.`,
      })

      console.log('✅ AI processing completed')
      
      // Log the raw result object
      console.log('📊 Raw AI result:', result)
      console.log('📊 Result keys:', Object.keys(result))
      
      // Convert the result to a simple object that can be serialized
      const response = {
        text: result.text,
        toolCalls: result.toolCalls,
        toolResults: result.toolResults,
        finishReason: result.finishReason,
        usage: result.usage
      }
      
      console.log('📤 Server response before return:', response)
      console.log('📤 Response text:', response.text)
      console.log('📤 Response tool calls:', response.toolCalls)
      console.log('📤 Response tool results:', response.toolResults)
      
      return response
      
    } catch (error) {
      console.error('❌ Chat server function error:', error)
      const errorObj = error as Error
      console.log('❌ Error details:', {
        name: errorObj.name,
        message: errorObj.message,
        stack: errorObj.stack
      })
      throw new Error(`Failed to process chat message: ${errorObj.message}`)
    }
  }) 
