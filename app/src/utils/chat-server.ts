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
          }
        },
        system: `You are an AI resource search assistant for AI Hacks, a curated collection of AI resources, tools, and documentation.

Your goal is to help users discover relevant AI resources through natural conversation. You have access to:
- A semantic search tool to find resources based on content similarity
- A trending resources tool to show popular and recent content
- A get resource tool to retrieve specific resources by ID

Guidelines:
- Be conversational and helpful
- When users ask questions, use semantic search to find relevant resources
- If semantic search returns no results, try trending_resources to show what's available
- Provide context about why resources are relevant
- Suggest trending resources when appropriate
- Show resource details including titles, tags, reaction counts, and evergreen ratings
- Always provide actionable information and links when available
- If no results are found, acknowledge this and suggest alternative search terms or show trending content

Be concise but thorough. Focus on helping users find exactly what they need.`,
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