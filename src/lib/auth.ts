import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { count } from 'drizzle-orm'
import { db, schema } from '~/db'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'sqlite', schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
  },
  user: {
    additionalFields: {
      // input:false => clients can never set these at signup / update-user
      role: { type: 'string', required: false, defaultValue: 'contributor', input: false },
      partnerId: { type: 'number', required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (u) => {
          // Bootstrap: the very first account becomes the Admin.
          const [{ n }] = db.select({ n: count() }).from(schema.user).all()
          return { data: { ...u, role: n === 0 ? 'admin' : 'contributor' } }
        },
      },
    },
  },
  plugins: [tanstackStartCookies()], // keep last
})
