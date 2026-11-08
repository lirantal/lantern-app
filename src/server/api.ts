import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, desc, eq, or, sql, ne, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db, schema } from '~/db'
import { ITEM_TYPES, ROLES, SEVERITIES, STATUSES, canTriage, itemRef } from '~/lib/constants'
import { getSessionUser, requireAdmin, requireTriager, requireUser } from './guard'
import { similarity, tokens } from './similar'

const { item, product, partner, user, auditEvent } = schema
const reporterU = alias(user, 'reporter')
const ownerU = alias(user, 'owner')

const itemSelect = {
  id: item.id,
  title: item.title,
  type: item.type,
  severity: item.severity,
  status: item.status,
  productId: item.productId,
  productName: product.name,
  reporterId: item.reporterId,
  reporterName: reporterU.name,
  partnerId: item.partnerId,
  partnerName: partner.name,
  ownerId: item.ownerId,
  ownerName: ownerU.name,
  duplicateOfId: item.duplicateOfId,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
}

function baseItemQuery() {
  return db
    .select(itemSelect)
    .from(item)
    .innerJoin(product, eq(item.productId, product.id))
    .innerJoin(reporterU, eq(item.reporterId, reporterU.id))
    .leftJoin(partner, eq(item.partnerId, partner.id))
    .leftJoin(ownerU, eq(item.ownerId, ownerU.id))
}

// ---------- session ----------
export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => getSessionUser())

// ---------- reference data ----------
export const getMeta = createServerFn({ method: 'GET' }).handler(async () => {
  const me = await requireUser()
  const products = db.select().from(product).orderBy(product.name).all()
  const partners = db.select().from(partner).orderBy(partner.name).all()
  const people = canTriage(me.role)
    ? db
        .select({ id: user.id, name: user.name, role: user.role })
        .from(user)
        .orderBy(user.name)
        .all()
    : []
  return { products, partners, people }
})

// ---------- items: list ----------
const filterSchema = z.object({
  q: z.string().optional(),
  productId: z.coerce.number().int().optional(),
  status: z.enum(STATUSES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  type: z.enum(ITEM_TYPES).optional(),
  reporterId: z.string().optional(),
  partnerId: z.coerce.number().int().optional(),
  ownerId: z.string().optional(),
})
export type ItemFilters = z.infer<typeof filterSchema>

export const listItems = createServerFn({ method: 'GET' })
  .validator(filterSchema)
  .handler(async ({ data }) => {
    const me = await requireUser()
    const conds = []
    // Contributors only ever see their own submissions.
    if (!canTriage(me.role)) conds.push(eq(item.reporterId, me.id))
    else if (data.reporterId) conds.push(eq(item.reporterId, data.reporterId))
    if (data.productId) conds.push(eq(item.productId, data.productId))
    if (data.status) conds.push(eq(item.status, data.status))
    if (data.severity) conds.push(eq(item.severity, data.severity))
    if (data.type) conds.push(eq(item.type, data.type))
    if (data.partnerId) conds.push(eq(item.partnerId, data.partnerId))
    if (data.ownerId) conds.push(data.ownerId === 'none' ? sql`${item.ownerId} is null` : eq(item.ownerId, data.ownerId))
    if (data.q?.trim()) {
      const needle = `%${data.q.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`
      conds.push(
        or(
          sql`${item.title} like ${needle} escape '\\'`,
          sql`${item.description} like ${needle} escape '\\'`,
        )!,
      )
    }
    return baseItemQuery()
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(item.createdAt))
      .limit(300)
      .all()
  })

// ---------- items: detail ----------
export const getItem = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.coerce.number().int() }))
  .handler(async ({ data }) => {
    const me = await requireUser()
    const row = baseItemQuery().where(eq(item.id, data.id)).get()
    if (!row || (!canTriage(me.role) && row.reporterId !== me.id)) throw new Error('Not found')
    const full = db.select().from(item).where(eq(item.id, data.id)).get()!
    const actor = alias(user, 'actor')
    const events = db
      .select({
        id: auditEvent.id,
        action: auditEvent.action,
        field: auditEvent.field,
        oldValue: auditEvent.oldValue,
        newValue: auditEvent.newValue,
        createdAt: auditEvent.createdAt,
        actorName: actor.name,
      })
      .from(auditEvent)
      .innerJoin(actor, eq(auditEvent.actorId, actor.id))
      .where(eq(auditEvent.itemId, data.id))
      .orderBy(auditEvent.id)
      .all()
    return {
      item: {
        ...row,
        description: full.description,
        reproSteps: full.reproSteps,
        expected: full.expected,
        actual: full.actual,
        environment: full.environment,
        responseNote: full.responseNote,
      },
      events,
      canTriage: canTriage(me.role),
    }
  })

// ---------- items: similar (dedup assist) ----------
export const findSimilar = createServerFn({ method: 'GET' })
  .validator(z.object({ text: z.string().max(500), excludeId: z.number().int().optional() }))
  .handler(async ({ data }) => {
    const me = await requireUser()
    const probe = tokens(data.text)
    if (probe.size < 2) return []
    // Contributors only match against their own items so partners never see each other's feedback.
    const rows = db
      .select({ id: item.id, title: item.title, status: item.status, productName: product.name })
      .from(item)
      .innerJoin(product, eq(item.productId, product.id))
      .where(
        and(
          canTriage(me.role) ? undefined : eq(item.reporterId, me.id),
          data.excludeId ? ne(item.id, data.excludeId) : undefined,
        ),
      )
      .orderBy(desc(item.createdAt))
      .limit(500)
      .all()
    return rows
      .map((r) => ({ ...r, score: similarity(probe, tokens(r.title)) }))
      .filter((r) => r.score >= 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  })

// ---------- items: create ----------
const createSchema = z
  .object({
    title: z.string().trim().min(5, 'Give it a short, descriptive title').max(160),
    description: z.string().trim().min(10, 'Tell us a bit more').max(8000),
    productId: z.coerce.number().int(),
    type: z.enum(ITEM_TYPES),
    severity: z.enum(SEVERITIES),
    partnerId: z.coerce.number().int().nullish(),
    reproSteps: z.string().trim().max(8000).optional(),
    expected: z.string().trim().max(4000).optional(),
    actual: z.string().trim().max(4000).optional(),
    environment: z.string().trim().max(2000).optional(),
  })
  .refine((d) => d.type !== 'bug' || !!d.reproSteps, {
    path: ['reproSteps'],
    message: 'Bugs need reproduction steps',
  })

export const createItem = createServerFn({ method: 'POST' })
  .validator(createSchema)
  .handler(async ({ data }) => {
    const me = await requireUser()
    if (!db.select().from(product).where(eq(product.id, data.productId)).get()) throw new Error('Unknown product')
    const isBug = data.type === 'bug'
    return db.transaction((tx) => {
      const row = tx
        .insert(item)
        .values({
          title: data.title,
          description: data.description,
          productId: data.productId,
          type: data.type,
          severity: data.severity,
          reporterId: me.id,
          partnerId: data.partnerId ?? me.partnerId,
          reproSteps: isBug ? data.reproSteps : null,
          expected: isBug ? data.expected || null : null,
          actual: isBug ? data.actual || null : null,
          environment: isBug ? data.environment || null : null,
        })
        .returning({ id: item.id })
        .get()
      tx.insert(auditEvent).values({ itemId: row.id, actorId: me.id, action: 'created', newValue: data.title }).run()
      return { id: row.id }
    })
  })

// ---------- items: triage update ----------
const updateSchema = z.object({
  id: z.number().int(),
  status: z.enum(STATUSES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  type: z.enum(ITEM_TYPES).optional(),
  productId: z.number().int().optional(),
  ownerId: z.string().nullable().optional(),
  duplicateOfId: z.number().int().nullable().optional(),
  responseNote: z.string().trim().max(4000).nullable().optional(),
})

export const updateItem = createServerFn({ method: 'POST' })
  .validator(updateSchema)
  .handler(async ({ data }) => {
    const me = await requireTriager()
    return db.transaction((tx) => {
      const cur = tx.select().from(item).where(eq(item.id, data.id)).get()
      if (!cur) throw new Error('Not found')

      if (data.status === 'duplicate' || (data.duplicateOfId && !data.status)) {
        const target = data.duplicateOfId ?? cur.duplicateOfId
        if (!target || target === cur.id) throw new Error('Pick a different item to mark this as a duplicate of')
        if (!tx.select({ id: item.id }).from(item).where(eq(item.id, target)).get())
          throw new Error(`${itemRef(target)} does not exist`)
        data.status = 'duplicate'
        data.duplicateOfId = target
      } else if (data.status && (data.status as string) !== 'duplicate') {
        data.duplicateOfId = null
      }

      const names = (ids: (string | null | undefined)[]) => {
        const real = ids.filter((x): x is string => !!x)
        const rows = real.length ? tx.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, real)).all() : []
        return new Map(rows.map((r) => [r.id, r.name]))
      }
      const owners = names([cur.ownerId, data.ownerId])
      const prodName = (id: number) => tx.select().from(product).where(eq(product.id, id)).get()?.name ?? String(id)

      const patch: Partial<typeof item.$inferInsert> = {}
      const events: { field: string; oldValue: string | null; newValue: string | null }[] = []
      const change = (field: string, oldV: string | null, newV: string | null) => {
        if (oldV !== newV) events.push({ field, oldValue: oldV, newValue: newV })
      }

      if (data.status !== undefined && data.status !== cur.status) { patch.status = data.status; change('status', cur.status, data.status) }
      if (data.severity !== undefined && data.severity !== cur.severity) { patch.severity = data.severity; change('severity', cur.severity, data.severity) }
      if (data.type !== undefined && data.type !== cur.type) { patch.type = data.type; change('type', cur.type, data.type) }
      if (data.productId !== undefined && data.productId !== cur.productId) {
        patch.productId = data.productId
        change('product', prodName(cur.productId), prodName(data.productId))
      }
      if (data.ownerId !== undefined && (data.ownerId || null) !== cur.ownerId) {
        patch.ownerId = data.ownerId || null
        change('owner', cur.ownerId ? owners.get(cur.ownerId) ?? cur.ownerId : null, data.ownerId ? owners.get(data.ownerId) ?? data.ownerId : null)
      }
      if (data.duplicateOfId !== undefined && data.duplicateOfId !== cur.duplicateOfId) {
        patch.duplicateOfId = data.duplicateOfId
        change('duplicate_of', cur.duplicateOfId ? itemRef(cur.duplicateOfId) : null, data.duplicateOfId ? itemRef(data.duplicateOfId) : null)
      }
      if (data.responseNote !== undefined && (data.responseNote || null) !== cur.responseNote) {
        patch.responseNote = data.responseNote || null
        change('response_note', cur.responseNote, data.responseNote || null)
      }

      if (!events.length) return { changed: 0 }
      tx.update(item).set({ ...patch, updatedAt: new Date() }).where(eq(item.id, data.id)).run()
      for (const e of events)
        tx.insert(auditEvent).values({ itemId: data.id, actorId: me.id, action: 'field_changed', ...e }).run()
      return { changed: events.length }
    })
  })

// ---------- admin ----------
export const listUsers = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  return db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role, partnerId: user.partnerId, createdAt: user.createdAt })
    .from(user)
    .orderBy(user.createdAt)
    .all()
})

export const updateUser = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), role: z.enum(ROLES), partnerId: z.number().int().nullable() }))
  .handler(async ({ data }) => {
    const me = await requireAdmin()
    if (data.id === me.id && data.role !== 'admin') throw new Error("You can't remove your own admin role")
    db.update(user).set({ role: data.role, partnerId: data.partnerId, updatedAt: new Date() }).where(eq(user.id, data.id)).run()
    return { ok: true }
  })

export const createProduct = createServerFn({ method: 'POST' })
  .validator(z.object({ name: z.string().trim().min(1).max(80) }))
  .handler(async ({ data }) => {
    await requireAdmin()
    db.insert(product).values({ name: data.name }).onConflictDoNothing().run()
    return { ok: true }
  })

export const createPartner = createServerFn({ method: 'POST' })
  .validator(z.object({ name: z.string().trim().min(1).max(80) }))
  .handler(async ({ data }) => {
    await requireAdmin()
    db.insert(partner).values({ name: data.name }).onConflictDoNothing().run()
    return { ok: true }
  })
