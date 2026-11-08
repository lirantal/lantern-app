import { useEffect, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { createItem, findSimilar, getMeta } from '~/server/api'
import { ITEM_TYPES, SEVERITIES, SEVERITY_LABEL, TYPE_LABEL, itemRef, STATUS_LABEL, type Status } from '~/lib/constants'
import { Button } from '~/components/ui/button'
import { Card, CardBody } from '~/components/ui/card'
import { Field, Input, Select, Textarea } from '~/components/ui/form'

export const Route = createFileRoute('/_app/submit')({
  loader: () => getMeta(),
  component: SubmitPage,
})

function SubmitPage() {
  const { products, partners } = Route.useLoaderData()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const create = useServerFn(createItem)
  const similar = useServerFn(findSimilar)

  const [type, setType] = useState<string>('bug')
  const [title, setTitle] = useState('')
  const [matches, setMatches] = useState<Awaited<ReturnType<typeof findSimilar>>>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  // Dedup assist: debounce title and look for look-alikes.
  useEffect(() => {
    if (title.trim().length < 8) return setMatches([])
    const t = setTimeout(() => {
      similar({ data: { text: title } }).then(setMatches).catch(() => setMatches([]))
    }, 400)
    return () => clearTimeout(t)
  }, [title, similar])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    setFormError('')
    setBusy(true)
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    try {
      const res = await create({
        data: {
          title: f.title,
          description: f.description,
          productId: Number(f.productId),
          type: f.type as never,
          severity: f.severity as never,
          partnerId: f.partnerId ? Number(f.partnerId) : null,
          reproSteps: f.reproSteps || undefined,
          expected: f.expected || undefined,
          actual: f.actual || undefined,
          environment: f.environment || undefined,
        },
      })
      await navigate({ to: '/items/$id', params: { id: String(res.id) } })
    } catch (err) {
      // Zod errors arrive as a JSON-encoded issue list.
      try {
        const issues = JSON.parse((err as Error).message) as { path: (string | number)[]; message: string }[]
        setErrors(Object.fromEntries(issues.map((i) => [String(i.path[0]), i.message])))
      } catch {
        setFormError((err as Error).message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Submit feedback</h1>
        <p className="text-sm text-muted-foreground">One issue per submission, please. You'll see its status under My submissions.</p>
      </div>
      <Card>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Title" htmlFor="title" error={errors.title}>
              <Input id="title" name="title" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>

            {matches.length > 0 && (
              <div className="rounded-md border border-amber-300 bg-accent p-3 text-sm">
                <p className="mb-1 font-medium">You may have already reported something similar:</p>
                <ul className="list-inside list-disc">
                  {matches.map((m) => (
                    <li key={m.id}>
                      <Link to="/items/$id" params={{ id: String(m.id) }} target="_blank" className="underline">
                        {itemRef(m.id)} {m.title}
                      </Link>{' '}
                      <span className="text-muted-foreground">({STATUS_LABEL[m.status as Status]})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Product" htmlFor="productId">
                <Select id="productId" name="productId" required>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
              <Field label="Type" htmlFor="type">
                <Select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
                  {ITEM_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                </Select>
              </Field>
              <Field label="Severity" htmlFor="severity">
                <Select id="severity" name="severity" defaultValue="medium">
                  {SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}
                </Select>
              </Field>
            </div>

            <Field label="Partner" htmlFor="partnerId" hint="Which design partner is this feedback from?">
              <Select id="partnerId" name="partnerId" defaultValue={user.partnerId ?? ''}>
                <option value="">— None / internal —</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>

            <Field label="Description" htmlFor="description" error={errors.description}>
              <Textarea id="description" name="description" required rows={5} />
            </Field>

            {type === 'bug' && (
              <fieldset className="space-y-4 rounded-md border border-border bg-muted/50 p-4">
                <legend className="px-1 text-sm font-semibold">Reproduction</legend>
                <Field label="Steps to reproduce" htmlFor="reproSteps" error={errors.reproSteps}>
                  <Textarea id="reproSteps" name="reproSteps" required rows={4} placeholder={'1. …\n2. …\n3. …'} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Expected" htmlFor="expected"><Textarea id="expected" name="expected" rows={2} /></Field>
                  <Field label="Actual" htmlFor="actual"><Textarea id="actual" name="actual" rows={2} /></Field>
                </div>
                <Field label="Environment" htmlFor="environment" hint="Version, OS, CLI/IDE, anything relevant.">
                  <Input id="environment" name="environment" />
                </Field>
              </fieldset>
            )}

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit'}</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
