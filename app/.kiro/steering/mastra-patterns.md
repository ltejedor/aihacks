# Mastra Framework Patterns

## Core Agent Architecture

### Agent Configuration Best Practices
```typescript
import { Agent } from '@mastra/core'
import { anthropic } from '@ai-sdk/anthropic'
import { Memory } from '@mastra/memory'

export const agent = new Agent({
  name: 'Descriptive Agent Name',
  instructions: `Clear, specific instructions that:
    - Define the agent's role and purpose
    - Explain when and how to use tools
    - Set response format expectations
    - Include transparency requirements (explain reasoning)`,
  model: anthropic('claude-3-5-sonnet-latest'),
  tools: { toolName: toolInstance },
  memory: memoryInstance,
  evals: { // Optional: for quality monitoring
    summarization: new SummarizationMetric(model),
    contentSimilarity: new ContentSimilarityMetric()
  }
})
```

### Memory Integration for Conversations
```typescript
import { Memory } from '@mastra/memory'
import { LibSQLStore } from '@mastra/libsql'

const memory = new Memory({
  storage: new LibSQLStore({
    url: process.env.DATABASE_URL || 'file:./mastra.db'
  }),
  options: {
    lastMessages: 10, // Recent conversation history
    semanticRecall: true, // RAG-based memory retrieval
    threads: {
      generateTitle: true // Auto-generate conversation titles
    }
  }
})

// Always use with proper thread context
await agent.stream('message', {
  resourceId: 'user_123', // User identifier
  threadId: 'conversation_456' // Conversation identifier
})
```

## Tool Development Patterns

### Single-Purpose Tool Design
```typescript
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const toolName = createTool({
  id: 'descriptive-tool-id',
  description: 'Clear, concise description focusing on WHAT the tool does',
  inputSchema: z.object({
    param: z.string().describe('Clear parameter description')
  }),
  outputSchema: z.object({
    result: z.string(),
    metadata: z.object({}).optional()
  }),
  execute: async ({ context }) => {
    // Single-purpose logic only
    // Let the agent orchestrate, tool just acts
    return { result: 'clean, structured output' }
  }
})
```

### Tool Registration Pattern
```typescript
// 1. Create tool file: src/lib/mastra/tools/your-tool.ts
// 2. Export from index.ts
export { yourTool } from './your-tool'

export const allTools = {
  semantic_search: semanticSearchTool,
  trending_resources: trendingResourcesTool,
  get_resource: getResourceTool,
  reasoning: reasoningTool,
  your_tool: yourTool // Add here
}

// 3. Register with Vercel AI SDK in API route
tools: {
  your_tool_id: {
    description: 'Brief description',
    parameters: zodToJsonSchema(yourTool.inputSchema),
    execute: async (params) => {
      return await yourTool.execute(params)
    }
  }
}
```

## AI SDK Integration Patterns

### Streaming Chat with Memory
```typescript
// API Route: src/routes/api/chat.ts
import { streamText } from 'ai'
import { aiResourceSearchAgent } from '../../lib/mastra/agent'

export async function POST(request: Request) {
  const { messages, userId, threadId } = await request.json()
  
  const result = await streamText({
    model: aiResourceSearchAgent.model,
    messages,
    tools: {
      // Tool definitions here
    },
    onFinish: async ({ text, toolCalls, toolResults }) => {
      // Save to memory after completion
      await aiResourceSearchAgent.memory?.saveMessage({
        resourceId: userId,
        threadId,
        message: { role: 'assistant', content: text }
      })
    }
  })
  
  return result.toDataStreamResponse()
}
```

### Client-Side Chat Interface
```typescript
import { useChat } from 'ai/react'

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: {
      userId: user.id,
      threadId: currentThreadId
    },
    onToolCall: ({ toolCall }) => {
      // Show tool usage transparently
      console.log('Agent using tool:', toolCall.toolName)
    }
  })
  
  return (
    <div className="chat-container">
      {messages.map(message => (
        <div key={message.id}>
          <div className="message-content">{message.content}</div>
          {message.toolInvocations?.map(tool => (
            <div key={tool.toolCallId} className="tool-usage">
              Using {tool.toolName}...
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
```

## RAG and Vector Search Patterns

### Document Processing for Knowledge Base
```typescript
import { MDocument } from '@mastra/rag'
import { embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'

// Process documents into searchable chunks
const doc = MDocument.fromText(documentText)
const chunks = await doc.chunk({
  strategy: 'recursive',
  size: 512,
  overlap: 50
})

// Generate embeddings
const { embeddings } = await embedMany({
  values: chunks.map(chunk => chunk.text),
  model: openai.embedding('text-embedding-3-small')
})

// Store in vector database (Supabase pgvector)
await supabase.from('message_embeddings').insert(
  chunks.map((chunk, i) => ({
    content: chunk.text,
    metadata: chunk.metadata,
    embedding: embeddings[i]
  }))
)
```

### Semantic Search Tool Implementation
```typescript
export const semanticSearchTool = createTool({
  id: 'semantic_search',
  description: 'Find AI resources using semantic similarity search',
  inputSchema: z.object({
    query: z.string().describe('Search query for AI resources')
  }),
  outputSchema: z.array(z.object({
    id: z.number(),
    content: z.string(),
    similarity: z.number(),
    metadata: z.object({})
  })),
  execute: async ({ context: { query } }) => {
    // Generate query embedding
    const { embedding } = await embed({
      value: query,
      model: openai.embedding('text-embedding-3-small')
    })
    
    // Search similar documents
    const { data } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 10
    })
    
    return data || []
  }
})
```

## Development and Testing Patterns

### Local Development Setup
```bash
# Start Mastra dev server
npm run dev
# or
mastra dev

# Access playground at http://localhost:4111
# - Test agents interactively
# - Debug tool executions
# - View conversation traces
# - Monitor eval results
```

### Agent Evaluation Setup
```typescript
import { SummarizationMetric, ContentSimilarityMetric } from '@mastra/evals'

export const agent = new Agent({
  // ... other config
  evals: {
    summarization: new SummarizationMetric(model),
    contentSimilarity: new ContentSimilarityMetric(),
    customEval: new CustomEval({
      name: 'Resource Relevance',
      description: 'Measures how relevant returned resources are to the query'
    })
  }
})
```

### Observability and Tracing
```typescript
export const mastra = new Mastra({
  agents: { aiResourceSearchAgent },
  telemetry: {
    serviceName: 'ai-hacks-search',
    enabled: true,
    sampling: { type: 'always_on' },
    export: {
      type: 'otlp',
      endpoint: process.env.OTEL_ENDPOINT
    }
  }
})
```

## MCP Integration Patterns

### Connecting to External Tool Servers
```typescript
import { MCPClient } from '@mastra/mcp'

const mcp = new MCPClient({
  servers: {
    filesystem: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/docs']
    },
    weather: {
      url: new URL('http://localhost:8080/mcp'),
      requestInit: {
        headers: { Authorization: `Bearer ${process.env.API_KEY}` }
      }
    }
  }
})

// Use with agent
const agent = new Agent({
  // ... other config
  tools: await mcp.getTools() // Static configuration
})
```

## Key Architectural Principles

1. **Agent Transparency**: Always explain reasoning and tool usage to users
2. **Memory Persistence**: Use proper resourceId/threadId for conversation continuity
3. **Tool Composability**: Design single-purpose tools that agents can combine
4. **Streaming First**: Prefer streaming responses for better user experience
5. **Type Safety**: Full TypeScript with Zod validation throughout
6. **Observability**: Enable tracing and evals for production monitoring
7. **RAG Integration**: Use semantic search for knowledge-grounded responses
8. **Development Workflow**: Use mastra dev playground for testing and debugging