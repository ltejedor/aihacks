import { semanticSearchTool } from './semantic-search'
import { trendingResourcesTool } from './trending-resources'
import { getResourceTool } from './get-resource'
import { reasoningTool } from './reasoning-tool'
import { exampleTool } from './example-tool'

// Export all tools as a Record for easy registration with Agent
export const allTools = {
  semantic_search: semanticSearchTool,
  trending_resources: trendingResourcesTool,
  get_resource: getResourceTool,
  reasoning: reasoningTool,
  // example: exampleTool, // Uncomment to enable the example tool
}

// Re-export individual tools for direct access
export { semanticSearchTool } from './semantic-search'
export { trendingResourcesTool } from './trending-resources'
export { getResourceTool } from './get-resource'
export { reasoningTool } from './reasoning-tool'
export { exampleTool } from './example-tool'
