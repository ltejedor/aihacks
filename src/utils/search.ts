import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from './supabase'
import { generateEmbedding } from './embeddings'

export type SearchResult = {
  id: number
  content: string
  metadata: {
    resource_id: string
    title: string
    tags: string[]
    date: string
    evergreen_rating: number
    reaction_count: number
  }
  similarity?: number
}

export const searchResources = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    // Handle the data wrapper from the client
    if (data && typeof data === 'object' && 'data' in data) {
      const query = (data as { data: string }).data
      if (typeof query === 'string') {
        return query
      }
    }
    // Fallback for direct string
    if (typeof data === 'string') {
      return data
    }
    return ''
  })
  .handler(async ({ data: query }) => {
    console.log('Search handler received query:', query)
    
    if (!query || !query.trim()) {
      console.log('Empty query, returning empty results')
      return []
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query)
    
    // Search for similar documents using Supabase RPC
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.01,
      match_count: 10
    })

    console.log('Search results:', data)

    if (error) {
      console.error('Search error:', error)
      throw new Error('Search failed')
    }

    return data as SearchResult[]
  })

export const getTrendingResources = createServerFn({ method: 'GET' })
  .handler(async () => {
    console.log('Fetching trending resources...')
    
    const supabase = getSupabaseServerClient()
    
    try {
      // Get all resources first, then sort and filter in JavaScript
      // This is more reliable than complex SQL queries on JSON columns
      const { data: allData, error } = await supabase
        .from('message_embeddings')
        .select('id, content, metadata')
        .limit(100) // Get more than we need, then filter

      if (error) {
        console.error('Error fetching resources:', error)
        return []
      }

      if (!allData || allData.length === 0) {
        console.log('No resources found')
        return []
      }

      // Process and filter the data
      const processedData = allData
        .map(item => ({
          ...item,
          metadata: typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata
        }))
        .filter(item => 
          item.metadata && 
          item.metadata.title && 
          item.metadata.date &&
          item.metadata.tags &&
          Array.isArray(item.metadata.tags)
        )

      // Calculate trending score and sort
      const now = Date.now()
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)
      
      const trendingResults = processedData
        .map(item => {
          const itemDate = new Date(item.metadata.date).getTime()
          const reactionCount = item.metadata.reaction_count || 0
          const evergreenRating = item.metadata.evergreen_rating || 0
          
          // Calculate trending score
          // Recent items get higher scores, reactions boost score, evergreen rating helps
          const daysSincePosted = Math.max(1, (now - itemDate) / (24 * 60 * 60 * 1000))
          const recencyScore = Math.max(0, 30 - daysSincePosted) / 30 // 0-1 based on recency
          const reactionScore = Math.min(1, reactionCount / 10) // Normalize reactions to 0-1
          const evergreenScore = evergreenRating / 5 // Normalize evergreen rating to 0-1
          
          const trendingScore = (recencyScore * 0.4) + (reactionScore * 0.4) + (evergreenScore * 0.2)
          
          return {
            ...item,
            trendingScore
          }
        })
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, 15) // Top 15 trending
        .map(({ trendingScore, ...item }) => item) // Remove the temporary scoring field

      console.log('Trending results found:', trendingResults.length)
      return trendingResults as SearchResult[]
      
    } catch (error) {
      console.error('Error in getTrendingResources:', error)
      return []
    }
  })
