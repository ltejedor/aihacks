# AI_HACKS - AI Resource Search Platform

A modern AI resource search platform built with TanStack Start and Supabase, featuring **agentic search** with semantic similarity across curated AI resources. Users can have natural conversations with an AI agent to discover relevant tools, tutorials, and insights.

## Features

- 🤖 **Agentic Search**: Conversational AI agent powered by Claude 3.5 Sonnet
- 🔍 **Semantic Search Tool**: Advanced search across AI resources using embeddings
- 🔥 **Trending Resources Tool**: Display of newest and most popular AI content
- 📋 **Resource Retrieval Tool**: Get specific resources by ID
- 💬 **Streaming Chat Interface**: Real-time conversation with visible tool usage
- 🔐 **Authentication**: User authentication powered by Supabase
- 📱 **Responsive Design**: Modern UI with hacker/terminal aesthetic
- ⚡ **Fast Performance**: Built with TanStack Start for optimal performance

## Tech Stack

- **Frontend**: React 19, TanStack Start v1.127.8, TypeScript
- **Backend**: Supabase (Database, Authentication, Real-time)
- **AI Agent**: Mastra framework with Claude 3.5 Sonnet
- **AI SDK**: Vercel AI SDK for streaming responses
- **Styling**: TailwindCSS
- **Build Tool**: Vite
- **Search**: Vector embeddings and similarity search

## Architecture

### Agentic Search System

The application uses an agentic architecture where users interact with an AI agent through natural conversation. The agent has access to specialized tools to fulfill user requests:

```
User Query → AI Agent → Tool Selection → Tool Execution → Response
```

### Available Tools

1. **Semantic Search Tool** (`semantic_search`)
   - Finds AI resources using vector similarity
   - Input: search query string
   - Output: ranked list of relevant resources

2. **Trending Resources Tool** (`trending_resources`)
   - Returns popular and recent AI resources
   - Input: limit (optional, default 15)
   - Output: trending resources with scores

3. **Get Resource Tool** (`get_resource`)
   - Retrieves specific resource by ID
   - Input: resource ID string
   - Output: single resource object or null

## Contributing: Adding New Tools

### Tool Architecture

Tools in this system follow the **Mastra framework** and adhere to these principles:

- **Single-purpose**: Each tool does one thing well
- **Lightweight**: Minimal parameters, sane defaults
- **Machine-friendly**: Return clean JSON, not verbose prose
- **Composable**: Can be mixed and matched by the agent
- **Self-contained**: No hard-coded sequences or dependencies

### Step-by-Step Guide

#### 1. Create Your Tool File

Create a new file in `src/lib/mastra/tools/your-tool-name.ts`:

```typescript
import { ToolApi } from '@mastra/core'
import { z } from 'zod'

const inputSchema = z.object({
  // Define your input parameters
  param1: z.string().describe('Description of parameter'),
  param2: z.number().optional().describe('Optional parameter')
})

const outputSchema = z.object({
  // Define your output structure
  result: z.string(),
  metadata: z.object({
    // Additional metadata
  })
})

export const yourToolName = new ToolApi({
  id: 'your_tool_id',
  description: 'Brief description of what this tool does',
  inputSchema,
  outputSchema,
  execute: async ({ param1, param2 }) => {
    // Your tool logic here
    // Return data matching outputSchema
    return {
      result: 'tool output',
      metadata: {}
    }
  }
})
```

#### 2. Register Your Tool

Add your tool to `src/lib/mastra/tools/index.ts`:

```typescript
export { yourToolName } from './your-tool-name'

// Add to the allTools array
export const allTools = [
  semanticSearchTool,
  trendingResourcesTool,
  getResourceTool,
  yourToolName, // Add your tool here
]
```

#### 3. Integrate with Chat API

Add your tool to the Vercel AI SDK configuration in `src/routes/api/chat.ts`:

```typescript
tools: {
  // ... existing tools
  your_tool_id: {
    description: 'Brief description matching your tool',
    parameters: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: 'Parameter description'
        }
      },
      required: ['param1']
    },
    execute: async ({ param1, param2 }) => {
      const { yourToolName } = await import('../../lib/mastra/tools/your-tool-name')
      return await yourToolName.execute({ param1, param2 })
    }
  }
}
```

#### 4. Update Chat Interface (Optional)

If your tool returns special data that needs custom rendering, update `src/components/ChatInterface.tsx` to handle your tool's output in the tool invocations section.

### Tool Development Best Practices

1. **Keep it simple**: One clear input → one clear output
2. **Document tersely**: Name, purpose, signature - keep examples short
3. **Return structured data**: Use Zod schemas for type safety
4. **Handle errors gracefully**: Let the agent handle error recovery
5. **Be technology-agnostic**: Focus on interfaces, not implementations
6. **Test thoroughly**: Ensure your tool works independently

### Example: Adding a "Search by Tag" Tool

```typescript
// src/lib/mastra/tools/search-by-tag.ts
import { ToolApi } from '@mastra/core'
import { z } from 'zod'
import { getSupabaseServerClient } from '../../utils/supabase'

const inputSchema = z.object({
  tag: z.string().min(1).describe('Tag to search for'),
  limit: z.number().min(1).max(20).default(10).describe('Number of results')
})

const outputSchema = z.array(z.object({
  id: z.number(),
  title: z.string(),
  tags: z.array(z.string())
}))

export const searchByTagTool = new ToolApi({
  id: 'search_by_tag',
  description: 'Find AI resources by specific tag',
  inputSchema,
  outputSchema,
  execute: async ({ tag, limit = 10 }) => {
    const supabase = getSupabaseServerClient()
    
    const { data, error } = await supabase
      .from('message_embeddings')
      .select('id, metadata')
      .contains('metadata->tags', [tag])
      .limit(limit)
    
    if (error) throw new Error('Tag search failed')
    
    return data.map(item => ({
      id: item.id,
      title: item.metadata.title,
      tags: item.metadata.tags
    }))
  }
})
```

This tool would then be registered in the index and API route following the steps above.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Anthropic API key

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/ltejedor/aihacks.git
cd aihacks
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
```

### 4. Database Setup

Set up the required tables in your Supabase database:

```sql
-- Create posts table
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create resources table for search functionality
CREATE TABLE resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  embedding vector(1536), -- Adjust dimension based on your embedding model
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  reactions INTEGER DEFAULT 0
);

-- Create message_embeddings table for AI resources
CREATE TABLE message_embeddings (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create searches table for query logging
CREATE TABLE searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create phone_numbers_temp table for phone auth
CREATE TABLE phone_numbers_temp (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_num TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON resources FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON message_embeddings FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON posts FOR SELECT USING (auth.role() = 'authenticated');

-- Create function for similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id int,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    message_embeddings.id,
    message_embeddings.content,
    message_embeddings.metadata,
    1 - (message_embeddings.embedding <=> query_embedding) AS similarity
  FROM message_embeddings
  WHERE 1 - (message_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
```

### 5. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ChatInterface.tsx # Main chat interface with agent
│   ├── Auth.tsx        # Authentication components
│   └── SearchResults.tsx # Legacy search results (deprecated)
├── lib/
│   └── mastra/         # Agent framework
│       ├── agent.ts    # Main agent configuration
│       └── tools/      # Tool implementations
│           ├── index.ts # Tool registry
│           ├── semantic-search.ts
│           ├── trending-resources.ts
│           └── get-resource.ts
├── routes/             # TanStack Router routes
│   ├── api/
│   │   └── chat.ts     # Chat API endpoint
│   ├── index.tsx       # Home page with chat
│   ├── search.tsx      # Search page with chat
│   └── _authed/        # Protected routes
├── utils/              # Utility functions
│   ├── supabase.ts     # Supabase client configuration
│   ├── search.ts       # Legacy search functions
│   └── embeddings.ts   # Vector embedding utilities
└── styles/             # CSS styles
    └── app.css         # Global styles and hacker theme
```

## Phone Authentication System

The application currently uses a streamlined phone-based authentication system designed to provide quick access to the AI resource search while maintaining user engagement tracking.

### Current Implementation (Faux-Auth)

**How it works:**
1. Users visit `/phone-login` and enter their phone number
2. The system creates an anonymous Supabase user session
3. The phone number is saved to a `phone_numbers_temp` table for logging purposes
4. Users gain immediate access to the search functionality

**Key Components:**
- `PhoneAuth.tsx`: Branded phone authentication component with WhatsApp community integration
- `phone-login.tsx`: Server function handling anonymous auth + phone logging
- `__root.tsx`: Updated user context to support both anonymous and authenticated users
- Route protection: Authenticated users are redirected away from `/phone-login`

**Benefits of Current System:**
- **Zero friction**: Users can access the search immediately without waiting for SMS
- **Community focus**: Emphasizes the connection to the AI Hacks WhatsApp community
- **Analytics**: Tracks user engagement and phone numbers for community building
- **Progressive enhancement**: Easy to upgrade to real verification later
- **Robust error handling**: Phone logging failures don't prevent authentication success

### Planned Upgrade: Real Phone Verification

**Future Implementation:**
The same user interface will be enhanced with actual phone number verification using Supabase's built-in OTP (One-Time Password) system:

1. **OTP Generation**: `supabase.auth.signInWithOtp({ phone: '+1234567890' })`
2. **Verification Step**: Users enter 6-digit code sent via SMS
3. **Authenticated Session**: Real phone-verified user account
4. **Data Migration**: Existing phone numbers will be linked to verified accounts

**Timeline:**
- **Phase 1** (Current): Anonymous auth + phone logging for rapid user onboarding
- **Phase 2** (Planned): Upgrade to real OTP verification with same UX
- **Phase 3** (Future): Optional account linking and advanced user features

This approach allows us to gather user interest and build the community while maintaining the technical infrastructure for a seamless upgrade to full phone verification.

## Authentication

The app includes authentication pages:
- `/phone-login` - Phone-based authentication
- `/login` - User login
- `/logout` - User logout

Protected routes require authentication to access the chat interface.

## Styling

The application uses a custom hacker/terminal theme with:
- Green terminal text (`text-hacker-green`)
- Cyan accents (`text-hacker-cyan`)
- Dark background (`bg-hacker-bg`)
- Monospace fonts for terminal feel
- Animated cursor and glitch effects

## Support

For issues and questions, please open an issue on the GitHub repository.
