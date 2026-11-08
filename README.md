# Lantern

Design-partner feedback hub: capture feedback from design partners, dogfooders and DevRel, then route, dedupe, prioritize, own and answer it.

**Stack:** TanStack Start · Better Auth · Drizzle + SQLite (better-sqlite3) · Tailwind v4 · shadcn-style components.

## Run locally

```bash
cp .env.example .env        # then set BETTER_AUTH_SECRET
npm install
npm run db:migrate
npm run dev                 # http://localhost:3000
```

The **first account to sign up becomes Admin**; everyone after is a Contributor. Admins promote users to Triager/Admin and manage products and partners under `/admin`.

## Roles

| Role | Can |
| --- | --- |
| Contributor | Submit feedback, see their own submissions, status and the team's response |
| Triager | Everything above, plus see all feedback, search/filter, set status/owner/severity, mark duplicates, respond to reporters |
| Admin | Everything above, plus manage users, products and partners |

## Design notes

- **Immutable audit trail**: `audit_event` rows are append-only; SQLite triggers reject UPDATE/DELETE (and items can't be deleted). See `drizzle/0001_audit_immutable.sql`.
- **Dedup assist**: titles are matched against existing items on submit and on the triage page. Contributors are only matched against their own items so partners never see each other's feedback.
- **Auth**: email + password (min 10 chars). `role` and `partnerId` are server-controlled and can't be set at signup. Google SSO is a later addition (Better Auth social provider).
- Authorization is enforced in every server function (`src/server/guard.ts`), not only in route guards.

## Deploy on Render

`render.yaml` defines one web service with a 1 GB persistent disk at `/var/data` holding the SQLite file. Set `BETTER_AUTH_URL` to the public URL after the first deploy. `npm start` applies migrations on boot.

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run typecheck` · `npm run db:generate` (after editing `src/db/schema.ts`) · `npm run db:migrate`
