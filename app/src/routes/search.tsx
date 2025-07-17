import { createFileRoute, redirect, useSearch, useLoaderData } from '@tanstack/react-router'
import { HybridSearchInterface } from '../components/HybridSearchInterface'
import { getFeedbackPhone } from '../utils/feedback'
import { z } from 'zod'

const searchSchema = z.object({
  q: z.string().optional(),
})

export const Route = createFileRoute('/search')({
  validateSearch: searchSchema,
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({
        to: '/phone-login',
      })
    }
  },
  loader: async () => {
    const phoneNumber = await getFeedbackPhone()
    return { phoneNumber }
  },
  component: SearchPage,
})

function SearchPage() {
  const { q } = useSearch({ from: '/search' })
  
  return (
    <div className="min-h-screen bg-slate-900">
      <HybridSearchInterface initialQuery={q} />
    </div>
  )
}
