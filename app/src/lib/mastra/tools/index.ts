export { semanticSearchTool } from './semantic-search'
export { trendingResourcesTool } from './trending-resources'
export { getResourceTool } from './get-resource'
export { reasoningTool } from './reasoning-tool'
export { exampleTool } from './example-tool'

// Export all tools as an array for easy registration
export const allTools = [
  semanticSearchTool,
  trendingResourcesTool,
  getResourceTool,
  reasoningTool,
  // exampleTool, // Uncomment to enable the example tool
]
