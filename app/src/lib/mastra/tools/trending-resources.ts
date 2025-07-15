import { z } from 'zod'
import { getSupabaseServerClient } from '../../../utils/supabase'

const inputSchema = z.object({
  limit: z.number().min(1).max(50).default(15).describe('Number of trending resources to return')
})

const outputSchema = z.array(z.object({
  id: z.number(),
  content: z.string(),
  metadata: z.object({
    resource_id: z.string(),
    title: z.string(),
    tags: z.array(z.string()),
    date: z.string(),
    evergreen_rating: z.number(),
    reaction_count: z.number()
  })
}))

export const trendingResourcesTool = {
  id: 'trending_resources',
  description: 'Get trending AI resources based on recency, reactions, and evergreen rating',
  inputSchema,
  outputSchema,
  execute: async ({ limit = 15 }: { limit?: number }) => {
    console.log('📈 [TRENDING RESOURCES] Starting execution with limit:', limit)
    
    try {
      const supabase = getSupabaseServerClient()
      console.log('📈 [TRENDING RESOURCES] Supabase client initialized')
      
      // Get all resources first, then sort and filter in JavaScript
      console.log('📈 [TRENDING RESOURCES] Fetching resources from database')
      const { data: allData, error } = await supabase
        .from('message_embeddings')
        .select('id, content, metadata')
        .limit(100)

      if (error) {
        console.error('📈 [TRENDING RESOURCES] Database error:', error)
        return []
      }

      console.log('📈 [TRENDING RESOURCES] Raw data fetched, count:', allData?.length || 0)

      if (!allData || allData.length === 0) {
        console.log('📈 [TRENDING RESOURCES] No data found, returning empty array')
        return []
      }

      // Parse and validate metadata for each resource
      const validData = allData.map(item => {
        try {
          const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata
          
          return {
            id: item.id,
            content: item.content,
            metadata: {
              resource_id: metadata.resource_id || 'unknown',
              title: metadata.title || 'Untitled',
              tags: Array.isArray(metadata.tags) ? metadata.tags : [],
              date: metadata.date || new Date().toISOString(),
              evergreen_rating: typeof metadata.evergreen_rating === 'number' ? metadata.evergreen_rating : 0,
              reaction_count: typeof metadata.reaction_count === 'number' ? metadata.reaction_count : 0
            }
          }
        } catch (parseError) {
          console.error('📈 [TRENDING RESOURCES] Failed to parse metadata for item:', item.id, parseError)
          return null
        }
      }).filter(item => item !== null)

      console.log('📈 [TRENDING RESOURCES] Valid data count:', validData.length)

      // Calculate trending score for each resource
      const scoredData = validData.map(item => {
        const now = new Date()
        const resourceDate = new Date(item.metadata.date)
        const daysDiff = Math.max(1, (now.getTime() - resourceDate.getTime()) / (1000 * 60 * 60 * 24))
        
        // Trending score calculation: (reactions + evergreen_rating) / age_in_days
        const trendingScore = (item.metadata.reaction_count + item.metadata.evergreen_rating) / daysDiff
        
        return {
          ...item,
          trendingScore
        }
      })

      // Sort by trending score (descending) and limit results
      const trendingData = scoredData
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit)
        .map(({ trendingScore, ...item }) => item) // Remove the temporary trendingScore property

      console.log('📈 [TRENDING RESOURCES] Trending data processed, returning', trendingData.length, 'results')
      console.log('📈 [TRENDING RESOURCES] Top result:', trendingData[0])

      return trendingData
    } catch (error) {
      console.error('📈 [TRENDING RESOURCES] Execution error:', error)
      return []
    }
  }
}
