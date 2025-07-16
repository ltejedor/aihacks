# Technology Stack

## Core Framework
- **Frontend**: React 19 with TanStack Start v1.127.8
- **Backend**: Supabase (Database, Authentication, Real-time)
- **Build Tool**: Vite 6.3.5
- **Language**: TypeScript 5.7.2

## AI & Agent Framework
- **Agent Framework**: Mastra Core v0.10.14
- **AI Model**: Claude 3.5 Sonnet via @ai-sdk/anthropic
- **AI SDK**: Vercel AI SDK v4.0.30 for streaming responses
- **Schema Validation**: Zod v3.23.8

## Styling & UI
- **CSS Framework**: TailwindCSS v3.4.17
- **Theme**: Custom hacker/terminal aesthetic with green/cyan colors
- **Fonts**: JetBrains Mono, Monaco (monospace focus)

## Database & Storage
- **Database**: Supabase PostgreSQL with vector extensions
- **Vector Search**: pgvector for embeddings (1536 dimensions)
- **Authentication**: Supabase Auth with phone-based flow

## Development Tools
- **Router**: TanStack Router with file-based routing
- **HTTP Client**: redaxios (lightweight axios alternative)
- **Path Resolution**: vite-tsconfig-paths for `~/*` imports

## Common Commands

```bash
# Development
npm run dev          # Start dev server on port 3000

# Production
npm run build        # Build + TypeScript check
npm run start        # Start production server

# Dependencies
npm install          # Install all dependencies
```

## Environment Variables Required
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
```

## Key Technical Patterns
- **Server Functions**: TanStack Start `createServerFn` for API routes
- **Tool Architecture**: Mastra framework with Zod schemas
- **Streaming**: AI SDK streaming for real-time chat responses
- **Type Safety**: Full TypeScript with strict mode enabled