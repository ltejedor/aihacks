# Project Structure

## Root Directory
```
├── .env                    # Environment variables
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite configuration
├── tailwind.config.mjs    # TailwindCSS config with hacker theme
├── tsconfig.json          # TypeScript configuration
└── src/                   # Source code
```

## Source Structure (`src/`)

### Core Application
```
src/
├── router.tsx             # TanStack Router setup
├── routeTree.gen.ts       # Generated route tree (auto-generated)
└── routes/                # File-based routing
    ├── __root.tsx         # Root layout with user context
    ├── index.tsx          # Home page with chat interface
    ├── search.tsx         # Search page
    ├── phone-login.tsx    # Phone authentication
    └── api/               # API routes
        └── chat.ts        # Chat streaming endpoint
```

### Components (`src/components/`)
```
components/
├── ChatInterface.tsx      # Main chat UI with agent interaction
├── Auth.tsx              # Authentication wrapper
├── PhoneAuth.tsx         # Phone number input component
├── Login.tsx             # Login form
├── SearchInput.tsx       # Legacy search input
├── SearchResults.tsx     # Legacy search results
├── DefaultCatchBoundary.tsx # Error boundary
└── NotFound.tsx          # 404 page
```

### Agent Framework (`src/lib/mastra/`)
```
lib/mastra/
├── agent.ts              # Main agent configuration with Claude 3.5
└── tools/                # Tool implementations
    ├── index.ts          # Tool registry and exports
    ├── semantic-search.ts # Vector similarity search
    ├── trending-resources.ts # Popular content retrieval
    ├── get-resource.ts   # Single resource lookup
    ├── reasoning-tool.ts # Transparent reasoning
    └── example-tool.ts   # Template for new tools
```

### Utilities (`src/utils/`)
```
utils/
├── supabase.ts           # Supabase client configuration
├── chat-server.ts        # Chat server utilities
├── embeddings.ts         # Vector embedding functions
├── search.ts             # Legacy search functions
├── posts.ts              # Post-related utilities
└── seo.ts                # SEO meta tag helpers
```

### Styling (`src/styles/`)
```
styles/
└── app.css               # Global styles with hacker theme
```

### Hooks (`src/hooks/`)
```
hooks/
└── useMutation.ts        # Custom mutation hook
```

## Key Architectural Patterns

### File-Based Routing
- Routes defined in `src/routes/` directory
- `__root.tsx` provides global layout and user context
- Protected routes use `beforeLoad` for authentication checks

### Agent Tool System
- Tools registered in `src/lib/mastra/tools/index.ts`
- Each tool follows Mastra framework with Zod schemas
- Tools are both registered with Mastra agent and Vercel AI SDK

### Authentication Flow
- User context provided by `__root.tsx`
- Phone-based authentication with anonymous sessions
- Protected routes redirect unauthenticated users

### Styling Convention
- Hacker theme colors: `hacker-green`, `hacker-cyan`, `hacker-bg`
- Monospace fonts: `font-mono`, `font-hacker`
- Component-level styling with TailwindCSS classes

## Import Patterns
- Use `~/*` for absolute imports from `src/`
- Server functions use `createServerFn` from TanStack Start
- Components use default exports
- Utilities use named exports