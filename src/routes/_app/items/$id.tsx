import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { findSimilar, getItem, getMeta, updateItem } from '~/server/api'
import { Button } from '~/components/ui/button'
import { Card, CardBody, CardHeader } from '~/components/ui/card'
import { Field, Input, Select, Textarea } from '~/components/ui/form'
import { SeverityBadge, StatusBadge, TypeBadge } from '~/components/badges'
import { ITEM_TYPES, SEVERITIES, SEVERITY_LABEL, STATUSES, STATUS_LABEL, TYPE_LABEL, itemRef, type Status } from '~/lib/constants'
import { fmtDate } from '~/lib/utils'

export const Route = createFileRoute('/_app/items/$id')({
  loader: async ({ params }) => {
    const detail = await getItem({ data: { id: Number(params.id) } })
    const meta = detail.canTriage ? await getMeta() : null
    const similar = detail.canTriage
      ? await findSimilar({ data: { text: detail.item.title, excludeId: detail.item.id } })
      : []
    return { ...detail, meta, similar }
  },
  component: ItemPage,
})

function Block({ title, children }: { title: string; children?: string | null }) {
  if (!children) return null
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{title}</h3>
      <p className="whitespace-pre-wrap text-sm">{children}</p>
    </div>
  )
}

const FIELD_LABEL: Record<string, string> = {
  status: 'Status', severity: 'Severity', type: 'Type', product: 'Product', owner: 'Owner',
  duplicate_of: 'Duplicate of', response_note: 'Response to reporter',
}
const prettyVal = (field: string | null, v: string | null) =>
  v == null || v === '' ? '—' : field === 'status' ? STATUS_LABEL[v as Status] ?? v : v

function ItemPage() {
  const { item, events, canTriage, meta, similar } = Route.useLoaderData()
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">{itemRef(item.id)} · {item.productName}</p>
          <h1 className="text-2xl font-semibold">{item.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            <TypeBadge type={item.type} />
            <SeverityBadge severity={item.severity} />
            {item.duplicateOfId && (
              <Link to="/items/$id" params={{ id: String(item.duplicateOfId) }} className="text-sm underline">
                Duplicate of {itemRef(item.duplicateOfId)}
              </Link>
            )}
          </div>
        </div>

        {item.responseNote && (
          <Card className="border-primary/40 bg-accent">
            <CardBody>
              <h2 className="mb-1 text-sm font-semibold">Response from the team</h2>
              <p className="whitespace-pre-wrap text-sm">{item.responseNote}</p>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody className="space-y-4">
            <Block title="Description">{item.description}</Block>
            <Block title="Steps to reproduce">{item.reproSteps}</Block>
            <Block title="Expected">{item.expected}</Block>
            <Block title="Actual">{item.actual}</Block>
            <Block title="Environment">{item.environment}</Block>
            <p className="text-xs text-muted-foreground">
              Reported by {item.reporterName}
              {item.partnerName ? ` (${item.partnerName})` : ''} on {fmtDate(item.createdAt)}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>History</CardHeader>
          <CardBody>
            <ol className="space-y-3 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p>
                      <strong>{e.actorName}</strong>{' '}
                      {e.action === 'created'
                        ? 'submitted this item'
                        : <>changed <em>{FIELD_LABEL[e.field ?? ''] ?? e.field}</em>: {prettyVal(e.field, e.oldValue)} → {prettyVal(e.field, e.newValue)}</>}
                    </p>
                    <p className="text-xs text-muted-foreground">{fmtDate(e.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>

      {canTriage && meta && (
        <aside className="space-y-4">
          <TriagePanel item={item} meta={meta} />
          {similar.length > 0 && (
            <Card>
              <CardHeader>Possible duplicates</CardHeader>
              <CardBody className="space-y-2 text-sm">
                {similar.map((s) => (
                  <Link key={s.id} to="/items/$id" params={{ id: String(s.id) }} className="block underline">
                    {itemRef(s.id)} {s.title}
                  </Link>
                ))}
              </CardBody>
            </Card>
          )}
        </aside>
      )}
    </div>
  )
}

function TriagePanel({
  item,
  meta,
}: {
  item: Awaited<ReturnType<typeof getItem>>['item']
  meta: Awaited<ReturnType<typeof getMeta>>
}) {
  const router = useRouter()
  const update = useServerFn(updateItem)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(item.status)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setSaved(false); setBusy(true)
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    try {
      await update({
        data: {
          id: item.id,
          status: f.status as never,
          severity: f.severity as never,
          type: f.type as never,
          productId: Number(f.productId),
          ownerId: f.ownerId || null,
          duplicateOfId: f.status === 'duplicate' ? Number(String(f.duplicateOf).replace(/\D/g, '')) || null : undefined,
          responseNote: f.responseNote || null,
        },
      })
      await router.invalidate()
      setSaved(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>Triage</CardHeader>
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-3" key={`${item.id}-${item.updatedAt}`}>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </Select>
          </Field>
          {status === 'duplicate' && (
            <Field label="Duplicate of" htmlFor="duplicateOf" hint="Item number, e.g. 12 or LAN-12">
              <Input id="duplicateOf" name="duplicateOf" required defaultValue={item.duplicateOfId ? itemRef(item.duplicateOfId) : ''} />
            </Field>
          )}
          <Field label="Owner" htmlFor="ownerId">
            <Select id="ownerId" name="ownerId" defaultValue={item.ownerId ?? ''}>
              <option value="">Unassigned</option>
              {meta.people.filter((p) => p.role !== 'contributor').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Severity" htmlFor="severity">
            <Select id="severity" name="severity" defaultValue={item.severity}>
              {SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}
            </Select>
          </Field>
          <Field label="Type" htmlFor="type">
            <Select id="type" name="type" defaultValue={item.type}>
              {ITEM_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </Select>
          </Field>
          <Field label="Product" htmlFor="productId">
            <Select id="productId" name="productId" defaultValue={item.productId}>
              {meta.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Response to reporter" htmlFor="responseNote" hint="Visible to the reporter — use it to close the loop.">
            <Textarea id="responseNote" name="responseNote" rows={4} defaultValue={item.responseNote ?? ''} />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && <p className="text-sm text-green-700 dark:text-green-400">Saved.</p>}
          <Button type="submit" className="w-full" disabled={busy}>Save changes</Button>
        </form>
      </CardBody>
    </Card>
  )
}
