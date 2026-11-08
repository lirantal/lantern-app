import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

const ts = (name: string) =>
  integer(name, { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())

// ---------- Better Auth tables ----------
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('contributor'),
  partnerId: integer('partner_id'),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
})

// ---------- Lantern tables ----------
export const product = sqliteTable('product', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  createdAt: ts('created_at'),
})

export const partner = sqliteTable('partner', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  createdAt: ts('created_at'),
})

export const item = sqliteTable(
  'item',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    productId: integer('product_id').notNull().references(() => product.id),
    type: text('type').notNull(),
    severity: text('severity').notNull(),
    status: text('status').notNull().default('new'),
    // bug repro block
    reproSteps: text('repro_steps'),
    expected: text('expected'),
    actual: text('actual'),
    environment: text('environment'),
    reporterId: text('reporter_id').notNull().references(() => user.id),
    partnerId: integer('partner_id').references(() => partner.id),
    ownerId: text('owner_id').references(() => user.id),
    duplicateOfId: integer('duplicate_of_id'),
    /** Reporter-visible message used to close the loop. */
    responseNote: text('response_note'),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at'),
  },
  (t) => [
    index('item_status_idx').on(t.status),
    index('item_reporter_idx').on(t.reporterId),
    index('item_product_idx').on(t.productId),
  ],
)

/** Append-only. UPDATE/DELETE are rejected by SQLite triggers (see drizzle/*_audit_immutable.sql). */
export const auditEvent = sqliteTable(
  'audit_event',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    itemId: integer('item_id').notNull().references(() => item.id),
    actorId: text('actor_id').notNull().references(() => user.id),
    action: text('action').notNull(), // created | field_changed
    field: text('field'),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    createdAt: ts('created_at'),
  },
  (t) => [index('audit_item_idx').on(t.itemId)],
)
