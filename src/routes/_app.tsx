import { Link, Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { authClient } from '~/lib/auth-client'
import { getCurrentUser } from '~/server/api'
import { ROLE_LABEL, canTriage, isAdmin, type Role } from '~/lib/constants'
import { Button } from '~/components/ui/button'

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
  component: AppLayout,
})

const linkCls = 'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted'
const activeCls = { className: 'bg-accent text-foreground' }

function AppLayout() {
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
          <Link to="/" className="mr-4 text-lg font-semibold">🏮 Lantern</Link>
          <nav className="flex flex-1 gap-1">
            <Link to="/submit" className={linkCls} activeProps={activeCls}>Submit feedback</Link>
            <Link to="/my" className={linkCls} activeProps={activeCls}>My submissions</Link>
            {canTriage(user.role) && (
              <Link to="/items" className={linkCls} activeProps={activeCls}>All feedback</Link>
            )}
            {isAdmin(user.role) && (
              <Link to="/admin" className={linkCls} activeProps={activeCls}>Admin</Link>
            )}
          </nav>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.name} · {ROLE_LABEL[user.role as Role]}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await authClient.signOut()
              await navigate({ to: '/login', reloadDocument: true })
            }}
          >
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
