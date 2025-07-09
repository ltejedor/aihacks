import { redirect, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/signup')({
  beforeLoad: () => {
    throw redirect({
      to: '/phone-login',
    })
  },
})
