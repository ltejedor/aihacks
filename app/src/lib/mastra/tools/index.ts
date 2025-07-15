export { semanticSearchTool } from './semantic-search'
export { trendingResourcesTool } from './trending-resources'
export { getResourceTool } from './get-resource'
export { exampleTool } from './example-tool'

// Export all tools as an array for easy registration
export const allTools = [
  semanticSearchTool,
  trendingResourcesTool,
  getResourceTool,
  // exampleTool, // Uncomment to enable the example tool
]
