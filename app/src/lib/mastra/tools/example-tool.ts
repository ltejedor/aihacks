import { ToolApi } from '@mastra/core'
import { z } from 'zod'

const inputSchema = z.object({
  message: z.string().min(1).describe('Message to echo back'),
  uppercase: z.boolean().default(false).describe('Whether to return message in uppercase')
})

const outputSchema = z.object({
  echo: z.string(),
  timestamp: z.string(),
  processed: z.boolean()
})

export const exampleTool = new ToolApi({
  id: 'example_echo',
  description: 'Example tool that echoes a message with optional uppercase transformation',
  inputSchema,
  outputSchema,
  execute: async ({ message, uppercase = false }) => {
    console.log('Example tool executing with message:', message)
    
    // Simple processing logic
    const processedMessage = uppercase ? message.toUpperCase() : message
    
    return {
      echo: processedMessage,
      timestamp: new Date().toISOString(),
      processed: true
    }
  }
})
