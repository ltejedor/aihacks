import { z } from 'zod'

// Base tool interface that all tools must implement
export interface Tool {
  id: string
  name: string
  description: string
  category: 'search' | 'discovery' | 'analysis' | 'external'
  icon: string
  enabled: boolean
  execute: (params: any) => Promise<any>
  schema: z.ZodSchema
}

// Tool result interface for standardized responses
export interface ToolResult {
  toolId: string
  toolName: string
  success: boolean
  data?: any
  error?: string
  executionTime?: number
  metadata?: Record<string, any>
}

// Tool registry to hold all available tools
export const TOOL_REGISTRY: Map<string, Tool> = new Map()

// Helper function to register a tool
export function registerTool(tool: Tool) {
  if (TOOL_REGISTRY.has(tool.id)) {
    // Tool already registered, skip silently
    return
  }
  TOOL_REGISTRY.set(tool.id, tool)
  console.log(`🔧 Registered tool: ${tool.name} (${tool.id})`)
}

// Helper function to get all enabled tools
export function getEnabledTools(): Tool[] {
  return Array.from(TOOL_REGISTRY.values()).filter(tool => tool.enabled)
}

// Helper function to get a specific tool
export function getTool(toolId: string): Tool | undefined {
  return TOOL_REGISTRY.get(toolId)
}

// Helper function to get tools by category
export function getToolsByCategory(category: Tool['category']): Tool[] {
  return Array.from(TOOL_REGISTRY.values()).filter(
    tool => tool.category === category && tool.enabled
  )
}

// Execute a tool with error handling and timing
export async function executeTool(
  toolId: string, 
  params: any
): Promise<ToolResult> {
  const startTime = Date.now()
  const tool = getTool(toolId)
  
  if (!tool) {
    return {
      toolId,
      toolName: 'Unknown',
      success: false,
      error: `Tool '${toolId}' not found`,
      executionTime: Date.now() - startTime
    }
  }

  if (!tool.enabled) {
    return {
      toolId,
      toolName: tool.name,
      success: false,
      error: `Tool '${toolId}' is currently disabled`,
      executionTime: Date.now() - startTime
    }
  }

  try {
    // Validate input parameters
    const validatedParams = tool.schema.parse(params)
    
    // Execute the tool
    const result = await tool.execute(validatedParams)
    
    return {
      toolId,
      toolName: tool.name,
      success: true,
      data: result,
      executionTime: Date.now() - startTime
    }
  } catch (error) {
    return {
      toolId,
      toolName: tool.name,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: Date.now() - startTime
    }
  }
}

// Get tool capabilities summary for the agent
export function getToolCapabilities(): string {
  const tools = getEnabledTools()
  
  return tools.map(tool => 
    `- ${tool.name} (${tool.id}): ${tool.description}`
  ).join('\n')
} 