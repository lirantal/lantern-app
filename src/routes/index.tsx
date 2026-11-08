import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '~/server/api'
import { canTriage } from '~/lib/constants'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/login' })
    throw redirect({ to: canTriage(user.role) ? '/items' : '/my' })
  },
})
