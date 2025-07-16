# Agent Development Guide

## Best Practices for Building Agents

When building AI agents for this project, follow these core principles:

### 1. Goal-Oriented Design
**Start from the goal, not the steps.**  
Describe *what* the agent needs to achieve; let the agent decide *how*.

### 2. Lightweight Tools
**Keep each tool lightweight & single-purpose.**  
One clear input ➜ one clear output. No monolithic "do-everything" utilities.

### 3. Minimal Interface
**Expose only the essentials.**  
Minimal parameters, sane defaults, short docs. Avoid long config lists.

### 4. Agent Orchestration
**Avoid hard-coding sequences.**  
Don't chain calls inside a tool. The agent orchestrates; the tool just acts.

### 5. Composable Design
**Be composable.**  
Design tools so they can be mixed and matched in novel ways.

### 6. Technology Agnostic
**Stay technology-agnostic.**  
Refer to interfaces ("REST endpoint", "SQL query", "filesystem read") rather than naming specific libraries unless strictly required.

### 7. Machine-Friendly Output
**Return machine-friendly responses.**  
Prefer clean JSON or plain text over verbose prose. No UI mock-ups.

### 8. Capability-Based
**Favor permissions over prescriptions.**  
Offer capabilities ("can read S3 object", "can post Slack message") instead of step-by-step procedures.

### 9. Terse Documentation
**Document tersely.**  
Three parts per tool: *name*, *purpose*, *signature*. Keep examples short.

### 10. Error Transparency
**Assume agents self-monitor.**  
Skip elaborate error-handling inside tools; surface raw errors so the agent can react.

## Tool Development Pattern

### Tool Structure
```typescript
import { ToolApi } from '@mastra/core'
import { z } from 'zod'

const inputSchema = z.object({
  param: z.string().describe('Clear parameter description')
})

const outputSchema = z.object({
  result: z.string(),
  metadata: z.object({}).optional()
})

export const toolName = new ToolApi({
  id: 'tool_id',
  description: 'Brief, clear purpose statement',
  inputSchema,
  outputSchema,
  execute: async ({ param }) => {
    // Single-purpose logic
    return { result: 'clean output' }
  }
})
```

### Registration Process
1. Create tool in `src/lib/mastra/tools/your-tool.ts`
2. Export from `src/lib/mastra/tools/index.ts`
3. Add to `allTools` object
4. Register with Vercel AI SDK in `src/routes/api/chat.ts`

### Agent Configuration
The main agent in `src/lib/mastra/agent.ts` follows these principles:
- **Transparent reasoning**: Uses reasoning tool to explain decisions
- **Tool selection**: Explains why specific tools are chosen
- **Result analysis**: Interprets and contextualizes tool outputs
- **User-focused**: Prioritizes user intent over rigid procedures

## Current Agent Tools

### Core Tools
- `semantic_search`: Vector similarity search across AI resources
- `trending_resources`: Popular and recent content retrieval  
- `get_resource`: Single resource lookup by ID
- `reasoning`: Transparent thought process articulation

### Tool Interaction Pattern
1. **Understand**: Agent analyzes user request using reasoning
2. **Plan**: Agent explains tool selection strategy
3. **Execute**: Agent uses tools while explaining approach
4. **Synthesize**: Agent analyzes results and explains relevance
5. **Recommend**: Agent provides thoughtful recommendations

This approach ensures transparency and helps users understand both the results and the reasoning process.