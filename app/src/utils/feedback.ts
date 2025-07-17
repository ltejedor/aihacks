import { createServerFn } from '@tanstack/react-start'

export const getFeedbackPhone = createServerFn({ method: 'GET' }).handler(async () => {
  return process.env.PHONE_NUM || null
})