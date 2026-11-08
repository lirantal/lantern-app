import { getRequest } from '@tanstack/react-start/server'
import { auth } from '~/lib/auth'
import { canTriage, isAdmin } from '~/lib/constants'

export type SessionUser = {
  id: string
  name: string
  email: string
  role: string
  partnerId: number | null
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: getRequest().headers })
  if (!session) return null
  const u = session.user as typeof session.user & { role?: string; partnerId?: number | null }
  return { id: u.id, name: u.name, email: u.email, role: u.role ?? 'contributor', partnerId: u.partnerId ?? null }
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser()
  if (!u) throw new Error('Unauthorized')
  return u
}

export async function requireTriager(): Promise<SessionUser> {
  const u = await requireUser()
  if (!canTriage(u.role)) throw new Error('Forbidden')
  return u
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser()
  if (!isAdmin(u.role)) throw new Error('Forbidden')
  return u
}
