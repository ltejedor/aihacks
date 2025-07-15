import { z } from 'zod'
import { getSupabaseServerClient } from '../../../utils/supabase'
import { generateEmbedding } from '../../../utils/embeddings'

const inputSchema = z.object({
  query: z.string().min(1).describe('The search query to find relevant AI resources')
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
  }),
  similarity: z.number().optional()
}))

export const semanticSearchTool = {
  id: 'semantic_search',
  description: 'Search AI resources using semantic similarity',
  inputSchema,
  outputSchema,
  execute: async ({ query }: { query: string }) => {
    console.log('🔍 [SEMANTIC SEARCH] Starting execution with query:', query)
    
    if (!query || !query.trim()) {
      console.log('🔍 [SEMANTIC SEARCH] Empty query, returning empty results')
      return []
    }

    try {
      const supabase = getSupabaseServerClient()
      console.log('🔍 [SEMANTIC SEARCH] Supabase client initialized')

      // Save the search query to the searches table
      try {
        console.log('🔍 [SEMANTIC SEARCH] Saving search query to database')
        await supabase.from('searches').insert({ content: query })
        console.log('🔍 [SEMANTIC SEARCH] Search query saved successfully')
      } catch (err) {
        console.error('🔍 [SEMANTIC SEARCH] Failed to save search query:', err)
      }

      // Generate embedding for the search query
      console.log('🔍 [SEMANTIC SEARCH] Generating embedding for query')
      const embedding = await generateEmbedding(query)
      console.log('🔍 [SEMANTIC SEARCH] Embedding generated successfully')

      // Perform semantic search using pgvector
      console.log('🔍 [SEMANTIC SEARCH] Performing semantic search')
      const { data, error } = await supabase.rpc('match_documents', {
        query_embedding: embedding,
        match_threshold: 0.01,
        match_count: 10
      })

      if (error) {
        console.error('🔍 [SEMANTIC SEARCH] Search error:', error)
        return []
      }

      console.log('🔍 [SEMANTIC SEARCH] Search completed, found', data?.length || 0, 'results')
      console.log('🔍 [SEMANTIC SEARCH] Search results:', data)

      return data || []
    } catch (error) {
      console.error('🔍 [SEMANTIC SEARCH] Execution error:', error)
      return []
    }
  }
}
