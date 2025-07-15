import { z } from 'zod'
import { getSupabaseServerClient } from '../../../utils/supabase'

const inputSchema = z.object({
  resourceId: z.string().min(1).describe('The unique identifier of the resource to retrieve')
})

const outputSchema = z.object({
  id: z.number(),
  content: z.string(),
  metadata: z.object({
    resource_id: z.string(),
    title: z.string(),
    tags: z.array(z.string()),
    date: z.string(),
    evergreen_rating: z.number(),
    reaction_count: z.number()
  })
}).nullable()

export const getResourceTool = {
  id: 'get_resource',
  description: 'Get a specific AI resource by its ID',
  inputSchema,
  outputSchema,
  execute: async ({ resourceId }: { resourceId: string }) => {
    console.log('📄 [GET RESOURCE] Starting execution with ID:', resourceId)
    
    try {
      const supabase = getSupabaseServerClient()
      console.log('📄 [GET RESOURCE] Supabase client initialized')
      
      // Query the database for a resource with the specific resource_id
      console.log('📄 [GET RESOURCE] Querying database for resource')
      const { data, error } = await supabase
        .from('message_embeddings')
        .select('id, content, metadata')
        .eq('metadata->>resource_id', resourceId)
        .single()

      if (error) {
        console.error('📄 [GET RESOURCE] Database error:', error)
        if (error.code === 'PGRST116') {
          // No rows returned
          console.log('📄 [GET RESOURCE] No resource found with ID:', resourceId)
          return null
        }
        return null
      }

      console.log('📄 [GET RESOURCE] Resource found:', data?.id)

      if (!data) {
        console.log('📄 [GET RESOURCE] No data returned')
        return null
      }

      // Parse and validate metadata
      try {
        const metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata
        
        const result = {
          id: data.id,
          content: data.content,
          metadata: {
            resource_id: metadata.resource_id || resourceId,
            title: metadata.title || 'Untitled',
            tags: Array.isArray(metadata.tags) ? metadata.tags : [],
            date: metadata.date || new Date().toISOString(),
            evergreen_rating: typeof metadata.evergreen_rating === 'number' ? metadata.evergreen_rating : 0,
            reaction_count: typeof metadata.reaction_count === 'number' ? metadata.reaction_count : 0
          }
        }

        console.log('📄 [GET RESOURCE] Resource processed successfully')
        return result
      } catch (parseError) {
        console.error('📄 [GET RESOURCE] Error parsing metadata:', parseError)
        return null
      }
    } catch (error) {
      console.error('📄 [GET RESOURCE] Execution error:', error)
      return null
    }
  }
}
