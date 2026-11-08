import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { createPartner, createProduct, getMeta, listUsers, updateUser } from '~/server/api'
import { Button } from '~/components/ui/button'
import { Card, CardBody, CardHeader } from '~/components/ui/card'
import { Input, Select } from '~/components/ui/form'
import { ROLES, ROLE_LABEL, isAdmin } from '~/lib/constants'

export const Route = createFileRoute('/_app/admin')({
  beforeLoad: ({ context }) => {
    if (!isAdmin(context.user.role)) throw redirect({ to: '/' })
  },
  loader: async () => {
    const [users, meta] = await Promise.all([listUsers(), getMeta()])
    return { users, meta }
  },
  component: AdminPage,
})

function AdminPage() {
  const { users, meta } = Route.useLoaderData()
  const router = useRouter()
  const saveUser = useServerFn(updateUser)
  const addProduct = useServerFn(createProduct)
  const addPartner = useServerFn(createPartner)
  const [error, setError] = useState('')

  const run = async (fn: () => Promise<unknown>) => {
    setError('')
    try { await fn(); await router.invalidate() } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Admin</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        {([
          ['Products', meta.products, addProduct],
          ['Partners', meta.partners, addPartner],
        ] as const).map(([label, list, add]) => (
          <Card key={label}>
            <CardHeader>{label}</CardHeader>
            <CardBody className="space-y-3">
              <ul className="flex flex-wrap gap-2 text-sm">
                {list.map((x) => <li key={x.id} className="rounded-full border border-border px-3 py-1">{x.name}</li>)}
              </ul>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  const form = e.currentTarget
                  const name = String(new FormData(form).get('name') ?? '')
                  run(async () => { await add({ data: { name } }); form.reset() })
                }}
              >
                <Input name="name" placeholder={`Add ${label.toLowerCase().slice(0, -1)}…`} required />
                <Button type="submit" variant="outline">Add</Button>
              </form>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="overflow-x-auto">
        <CardHeader>Users</CardHeader>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Partner</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-2">
                  <Select
                    className="w-36"
                    defaultValue={u.role}
                    onChange={(e) => run(() => saveUser({ data: { id: u.id, role: e.target.value as never, partnerId: u.partnerId } }))}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </Select>
                </td>
                <td className="px-4 py-2">
                  <Select
                    className="w-44"
                    defaultValue={u.partnerId ?? ''}
                    onChange={(e) => run(() => saveUser({ data: { id: u.id, role: u.role as never, partnerId: e.target.value ? Number(e.target.value) : null } }))}
                  >
                    <option value="">—</option>
                    {meta.partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
