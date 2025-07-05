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
