import { Mastra } from '@mastra/core/mastra';
import { aiResourceSearchAgent } from './agents/agent';

export const mastra = new Mastra({
  agents: { aiResourceSearchAgent },
  // workflows: { }, // Add workflows here when created
  // Note: Add storage and logger when those packages are installed
  // storage: new LibSQLStore({ url: ":memory:" }),
  // logger: new PinoLogger({ name: 'Mastra', level: 'info' }),
});

// Also export the agent directly for backward compatibility
export { aiResourceSearchAgent } from './agents/agent';

// Export individual tools directly
export { semanticSearchTool } from './tools/semantic-search';
export { trendingResourcesTool } from './tools/trending-resources';
export { getResourceTool } from './tools/get-resource';
export { reasoningTool } from './tools/reasoning-tool';
export { exampleTool } from './tools/example-tool'; 