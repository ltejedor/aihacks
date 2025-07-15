import { z } from 'zod'

const inputSchema = z.object({
  thinking: z.string().min(1).describe('The agent\'s current thought process or analysis'),
  context: z.string().optional().describe('Additional context about the current situation'),
  decision: z.string().optional().describe('The decision being made or approach being taken'),
  rationale: z.string().optional().describe('The reasoning behind the decision')
})

const outputSchema = z.object({
  reasoning: z.string(),
  insights: z.array(z.string()),
  next_steps: z.array(z.string()),
  confidence: z.number().min(0).max(1)
})

export const reasoningTool = {
  id: 'reasoning',
  description: 'Articulate thought process, analyze decisions, and explain reasoning to provide transparency',
  inputSchema,
  outputSchema,
  execute: async ({ thinking, context, decision, rationale }: { 
    thinking: string, 
    context?: string, 
    decision?: string, 
    rationale?: string 
  }) => {
    console.log('🧠 [REASONING] Starting reasoning process')
    console.log('🧠 [REASONING] Thinking:', thinking)
    console.log('🧠 [REASONING] Context:', context)
    console.log('🧠 [REASONING] Decision:', decision)
    console.log('🧠 [REASONING] Rationale:', rationale)
    
    // This tool helps structure the agent's reasoning process
    const insights = []
    const next_steps = []
    let confidence = 0.8
    
    // Analyze the thinking process
    if (thinking.toLowerCase().includes('search')) {
      insights.push('Identified need for information retrieval')
      next_steps.push('Execute appropriate search strategy')
    }
    
    if (thinking.toLowerCase().includes('trend')) {
      insights.push('Focusing on popular and recent content')
      next_steps.push('Analyze trending patterns and user engagement')
    }
    
    if (thinking.toLowerCase().includes('specific') || thinking.toLowerCase().includes('particular')) {
      insights.push('User has specific requirements or constraints')
      next_steps.push('Narrow down results to match specific criteria')
      confidence = 0.9
    }
    
    if (thinking.toLowerCase().includes('compare') || thinking.toLowerCase().includes('versus')) {
      insights.push('Comparative analysis required')
      next_steps.push('Gather multiple options for comparison')
    }
    
    if (thinking.toLowerCase().includes('beginner') || thinking.toLowerCase().includes('learn')) {
      insights.push('Educational content prioritization needed')
      next_steps.push('Focus on foundational and well-explained resources')
    }
    
    // Build comprehensive reasoning response
    let reasoning = `💭 **Thought Process**: ${thinking}`
    
    if (context) {
      reasoning += `\n\n📋 **Context**: ${context}`
    }
    
    if (decision) {
      reasoning += `\n\n⚡ **Decision**: ${decision}`
    }
    
    if (rationale) {
      reasoning += `\n\n🎯 **Rationale**: ${rationale}`
    }
    
    // Add default insights if none were generated
    if (insights.length === 0) {
      insights.push('Analyzing user intent and requirements')
      insights.push('Preparing to select most appropriate tools')
    }
    
    // Add default next steps if none were generated
    if (next_steps.length === 0) {
      next_steps.push('Proceed with planned approach')
      next_steps.push('Monitor results and adjust strategy if needed')
    }
    
    const result = {
      reasoning,
      insights,
      next_steps,
      confidence
    }
    
    console.log('🧠 [REASONING] Generated reasoning:', result)
    
    return result
  }
}
