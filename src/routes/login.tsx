import { useState } from 'react'
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { authClient } from '~/lib/auth-client'
import { getCurrentUser } from '~/server/api'
import { Button } from '~/components/ui/button'
import { Field, Input } from '~/components/ui/form'
import { Card, CardBody } from '~/components/ui/card'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    if (await getCurrentUser()) throw redirect({ to: '/' })
  },
  component: AuthPage,
})

export function AuthPage({ mode = 'login' }: { mode?: 'login' | 'signup' }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const signup = mode === 'signup'

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const f = new FormData(e.currentTarget)
    const email = String(f.get('email'))
    const password = String(f.get('password'))
    const res = signup
      ? await authClient.signUp.email({ email, password, name: String(f.get('name')) })
      : await authClient.signIn.email({ email, password })
    setBusy(false)
    if (res.error) return setError(res.error.message ?? 'Something went wrong')
    await navigate({ to: '/', reloadDocument: true })
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div className="text-center">
        <div className="text-3xl">🏮</div>
        <h1 className="text-2xl font-semibold">Lantern</h1>
        <p className="text-sm text-muted-foreground">Design-partner feedback, routed and answered.</p>
      </div>
      <Card>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            {signup && (
              <Field label="Name" htmlFor="name">
                <Input id="name" name="name" required autoComplete="name" />
              </Field>
            )}
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </Field>
            <Field label="Password" htmlFor="password" hint={signup ? 'At least 10 characters.' : undefined}>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={signup ? 10 : undefined}
                autoComplete={signup ? 'new-password' : 'current-password'}
              />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {signup ? 'Create account' : 'Sign in'}
            </Button>
          </form>
        </CardBody>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        {signup ? (
          <>Have an account? <Link to="/login" className="underline">Sign in</Link></>
        ) : (
          <>New here? <Link to="/signup" className="underline">Create an account</Link></>
        )}
      </p>
    </main>
  )
}
