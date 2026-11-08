import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { getMeta, listItems } from '~/server/api'
import { ItemTable } from '~/components/item-table'
import { Card } from '~/components/ui/card'
import { Input, Select } from '~/components/ui/form'
import { ITEM_TYPES, SEVERITIES, SEVERITY_LABEL, STATUSES, STATUS_LABEL, TYPE_LABEL, canTriage } from '~/lib/constants'

const searchSchema = z.object({
  q: z.string().optional(),
  productId: z.coerce.number().optional(),
  status: z.enum(STATUSES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  type: z.enum(ITEM_TYPES).optional(),
  reporterId: z.string().optional(),
  partnerId: z.coerce.number().optional(),
  ownerId: z.string().optional(),
})

export const Route = createFileRoute('/_app/items/')({
  validateSearch: (s: Record<string, unknown>) => {
    const parsed = searchSchema.safeParse(s)
    return parsed.success ? parsed.data : {}
  },
  beforeLoad: ({ context }) => {
    if (!canTriage(context.user.role)) throw redirect({ to: '/my' })
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [rows, meta] = await Promise.all([listItems({ data: deps }), getMeta()])
    return { rows, meta }
  },
  component: AllItems,
})

function AllItems() {
  const { rows, meta } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const set = (k: string, v: string) =>
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, [k]: v || undefined }) as never, replace: true })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">All feedback</h1>
        <p className="text-sm text-muted-foreground">{rows.length} item{rows.length === 1 ? '' : 's'}</p>
      </div>
      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          className="sm:col-span-2 lg:col-span-4"
          placeholder="Search title and description…"
          defaultValue={search.q ?? ''}
          onChange={(e) => set('q', e.target.value)}
        />
        <Select value={search.productId ?? ''} onChange={(e) => set('productId', e.target.value)}>
          <option value="">All products</option>
          {meta.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={search.status ?? ''} onChange={(e) => set('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </Select>
        <Select value={search.severity ?? ''} onChange={(e) => set('severity', e.target.value)}>
          <option value="">All severities</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}
        </Select>
        <Select value={search.type ?? ''} onChange={(e) => set('type', e.target.value)}>
          <option value="">All types</option>
          {ITEM_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </Select>
        <Select value={search.reporterId ?? ''} onChange={(e) => set('reporterId', e.target.value)}>
          <option value="">Any reporter</option>
          {meta.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={search.partnerId ?? ''} onChange={(e) => set('partnerId', e.target.value)}>
          <option value="">Any partner</option>
          {meta.partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={search.ownerId ?? ''} onChange={(e) => set('ownerId', e.target.value)}>
          <option value="">Any owner</option>
          <option value="none">Unassigned</option>
          {meta.people.filter((p) => p.role !== 'contributor').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </Card>
      <ItemTable rows={rows} showPeople />
    </div>
  )
}
