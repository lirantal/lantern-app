import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '~/server/api'
import { AuthPage } from './login'

export const Route = createFileRoute('/signup')({
  beforeLoad: async () => {
    if (await getCurrentUser()) throw redirect({ to: '/' })
  },
  component: () => <AuthPage mode="signup" />,
})
