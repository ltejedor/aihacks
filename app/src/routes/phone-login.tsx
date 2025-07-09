import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useRouter } from '@tanstack/react-router'
import { useMutation } from '../hooks/useMutation'
import { PhoneAuth } from '../components/PhoneAuth'
import { getSupabaseServerClient } from '../utils/supabase'

export const phoneLoginFn = createServerFn({ method: 'POST' })
  .validator((d: { phone: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    
    // Sign in anonymously
    const { error: authError } = await supabase.auth.signInAnonymously()
    
    if (authError) {
      return {
        error: true,
        message: authError.message,
      }
    }
    
    // Record the phone number for logging purposes
    try {
      const { error: insertError } = await supabase
        .from('phone_numbers_temp')
        .insert([
          { phone_num: data.phone }
        ])
      
      if (insertError) {
        console.error('Error recording phone number:', insertError)
        // Don't fail the auth if logging fails
      }
    } catch (error) {
      console.error('Error recording phone number:', error)
      // Don't fail the auth if logging fails
    }
    
    return {
      error: false,
      message: 'Authentication successful'
    }
  })

export const Route = createFileRoute('/phone-login')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({
        to: '/',
      })
    }
  },
  component: PhoneLoginComp,
})

function PhoneLoginComp() {
  const router = useRouter()

  const phoneLoginMutation = useMutation({
    fn: phoneLoginFn,
    onSuccess: async (ctx) => {
      if (!ctx.data?.error) {
        await router.invalidate()
        router.navigate({ to: '/' })
        return
      }
    },
  })

  return (
    <PhoneAuth
      status={phoneLoginMutation.status}
      onSubmit={(e) => {
        const formData = new FormData(e.target as HTMLFormElement)

        phoneLoginMutation.mutate({
          data: {
            phone: formData.get('phone') as string,
          },
        })
      }}
      afterSubmit={
        phoneLoginMutation.data?.error ? (
          <div className="text-red-400 text-sm text-center">
            {phoneLoginMutation.data.message}
          </div>
        ) : null
      }
    />
  )
}
