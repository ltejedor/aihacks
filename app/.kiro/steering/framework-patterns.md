# Framework Patterns & Best Practices

## TanStack Start Server Functions

Server functions are the backbone of full-stack functionality in this application. They run only on the server but can be called from anywhere.

### Key Patterns

**Server Function Definition**
```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const myServerFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => {
    // Runtime validation with Zod
    return MySchema.parse(data)
  })
  .handler(async ({ data }) => {
    // Server-only logic here
    return result
  })
```

**Authentication Context**
```typescript
// Access user context in server functions
import { getSupabaseServerClient } from '~/utils/supabase'

export const protectedFn = createServerFn()
  .handler(async () => {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw redirect({ to: '/phone-login' })
    return userData
  })
```

**Error Handling**
- Use `redirect()` for navigation (handled automatically by router)
- Use `notFound()` for 404 scenarios
- Regular errors become 500 responses with serialized error data

## Mastra Agent Architecture

### Agent Configuration Pattern
```typescript
import { Agent } from '@mastra/core'
import { anthropic } from '@ai-sdk/anthropic'

export const agent = new Agent({
  name: 'Descriptive Agent Name',
  instructions: `Clear, specific instructions about:
    - What the agent does
    - How it should behave
    - When to use which tools
    - Response format expectations`,
  model: anthropic('claude-3-5-sonnet-latest'),
  tools: { toolName: toolInstance },
  memory: memoryInstance // Optional for conversation persistence
})
```

### Tool Development Pattern
```typescript
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const toolName = createTool({
  id: 'descriptive-tool-id',
  description: 'Clear, concise description of what this tool does',
  inputSchema: z.object({
    param: z.string().describe('Parameter description')
  }),
  outputSchema: z.object({
    result: z.string(),
    metadata: z.object({}).optional()
  }),
  execute: async ({ context }) => {
    // Single-purpose logic
    return { result: 'clean output' }
  }
})
```

### Memory Integration
```typescript
import { Memory } from '@mastra/memory'
import { LibSQLStore } from '@mastra/libsql'

const memory = new Memory({
  storage: new LibSQLStore({
    url: process.env.DATABASE_URL
  }),
  options: {
    lastMessages: 10, // Include recent conversation history
    threads: {
      generateTitle: true // Auto-generate conversation titles
    }
  }
})

// Use with agent
const agent = new Agent({
  // ... other config
  memory
})

// Call with thread context
await agent.stream('message', {
  resourceId: 'user_123',
  threadId: 'conversation_456'
})
```

## Authentication Patterns

### Phone-Based Authentication
```typescript
// Current implementation: Anonymous auth + phone logging
const { data, error } = await supabase.auth.signInAnonymously()
if (!error) {
  // Log phone number separately for community building
  await logPhoneNumber(phoneNumber)
}

// Future: Real OTP verification
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+1234567890'
})
```

### Route Protection
```typescript
// In route files
export const Route = createFileRoute('/protected')({
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/phone-login' })
    }
  }
})
```

## Streaming & Real-time Patterns

### AI Response Streaming
```typescript
// Server function for streaming
export const chatFn = createServerFn({
  method: 'POST',
  response: 'raw' // Enable streaming
}).handler(async ({ data }) => {
  const stream = await agent.stream(data.message, {
    resourceId: data.userId,
    threadId: data.threadId
  })
  
  return new Response(stream.textStream, {
    headers: { 'Content-Type': 'text/event-stream' }
  })
})
```

### Client-Side Streaming
```typescript
// Using Vercel AI SDK
import { useChat } from 'ai/react'

const { messages, input, handleInputChange, handleSubmit } = useChat({
  api: '/api/chat',
  onToolCall: ({ toolCall }) => {
    // Handle tool invocations transparently
    console.log('Tool used:', toolCall.toolName)
  }
})
```

## Database & Vector Search

### Supabase Integration
```typescript
// Server-side client with cookie handling
export function getSupabaseServerClient() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(parseCookies()).map(([name, value]) => ({
            name, value
          }))
        },
        setAll(cookies) {
          cookies.forEach(cookie => setCookie(cookie.name, cookie.value))
        }
      }
    }
  )
}
```

### Vector Search Pattern
```typescript
// Semantic search implementation
const { data, error } = await supabase
  .rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 10
  })
```

## Key Architectural Principles

1. **Type Safety**: Full-stack TypeScript with runtime validation using Zod
2. **Server Functions**: Use for all server-side logic, not API routes
3. **Agent Transparency**: Always explain reasoning and tool usage
4. **Memory Persistence**: Use proper thread/resource IDs for conversation continuity
5. **Error Boundaries**: Let router handle redirects and notFounds automatically
6. **Streaming First**: Prefer streaming responses for better UX
7. **Tool Composability**: Design tools to be mixed and matched by agents
8. **Authentication Flow**: Phone-based with progressive enhancement path