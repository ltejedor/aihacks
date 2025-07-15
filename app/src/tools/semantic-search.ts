import { z } from 'zod'
import { Tool, registerTool } from './index'
import { searchResources } from '../utils/search'

// Schema for semantic search parameters
const semanticSearchSchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty'),
  limit: z.number().min(1).max(50).optional().default(10),
  similarityThreshold: z.number().min(0).max(1).optional().default(0.4)
})

// Semantic search tool implementation
const semanticSearchTool: Tool = {
  id: 'semantic-search',
  name: 'Semantic Search',
  description: 'Search through AI resources using semantic similarity matching. Best for finding relevant content based on meaning rather than exact keywords.',
  category: 'search',
  icon: '🔍',
  enabled: true,
  schema: semanticSearchSchema,
  execute: async (params) => {
    const { query, limit, similarityThreshold } = params
    
    try {
      // Call the existing search function
      const results = await searchResources({ data: query })
      
      console.log(`📊 Search found ${results.length} results, similarity threshold: ${similarityThreshold}`)
      console.log(`📊 Sample similarities: ${results.slice(0, 3).map(r => r.similarity?.toFixed(3) || 'N/A')}`)
      
      // Filter by similarity threshold if specified
      const filteredResults = results.filter(
        result => !result.similarity || result.similarity >= similarityThreshold
      )
      
      console.log(`📊 After filtering: ${filteredResults.length} results remain`)
      
      // Apply limit
      const limitedResults = filteredResults.slice(0, limit)
      
      return {
        results: limitedResults,
        total: results.length,
        filtered: filteredResults.length,
        query,
        metadata: {
          similarityThreshold,
          limit,
          hasMoreResults: filteredResults.length > limit
        }
      }
    } catch (error) {
      throw new Error(`Semantic search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Register the tool
registerTool(semanticSearchTool)

// Export for direct use if needed
export { semanticSearchTool } 