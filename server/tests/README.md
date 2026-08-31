# Test suite

Vitest + supertest, running against a real Postgres database (not mocked
Prisma) so the tests exercise real transaction and row-locking behavior —
in particular the optimistic-concurrency guard in the bid-placement engine,
which only means something under a real database.

## Why a separate schema, not a separate database

Supabase projects only support one physical database per project, so
"a separate test database" here means a separate Postgres **schema**
(`test`) inside the same database as dev, on the same connection string.
`src/lib/prisma.ts` reads `DATABASE_SCHEMA` and, if set, points the same
`@prisma/adapter-pg` adapter at that schema instead of the default
`public` — everything else about the connection is identical to dev/prod.

## One-time setup

1. Copy `.env.test.example` to `.env.test` and fill in the values (see the
   comments in that file for what each one needs).
2. Create the `test` schema's tables. This uses `prisma db push` (not
   `prisma migrate deploy`) deliberately — replaying the full versioned
   migration history against a schema other than `public` is not safe with
   this project's migrations: at least one existing migration
   (`20260826204916_orders_and_payments`) hardcodes `"public".Order` /
   `"public".ShippingStatus` in an enum-alteration statement (a known
   Prisma codegen quirk), which would run against the real `public` schema
   regardless of what schema you're trying to target. `db push` instead
   generates fresh DDL directly from the current `schema.prisma`, correctly
   scoped to whichever schema the connection string points at.

   ```sh
   DATABASE_URL="<same as .env.test, with &schema=test appended>" npx prisma db push
   ```

   Re-run this any time `prisma/schema.prisma` changes and the test schema
   needs to catch up. This is a schema-altering command — check the target
   is really `...&schema=test` (the CLI's own output confirms the schema
   name it's about to touch) before running it, never point it at a plain
   `DATABASE_URL` with no schema override.

## Running the suite

```sh
npm test
```

Every test calls `resetDatabase()` (see `helpers.ts`) in a `beforeEach`,
so each test starts from a genuinely empty `test` schema rather than
relying on manual per-test cleanup — no ordering dependencies between
tests, no leftover state from a previous run.

## Incident record: why `resetDatabase()` looks the way it does

On 2026-08-31, an earlier version of `resetDatabase()` truncated its table
list with **no schema qualification** (`TRUNCATE TABLE "User", ...`).
Prisma's own generated queries (`prisma.user.create()` etc.) do respect
`DATABASE_SCHEMA` — but raw SQL sent through `$executeRawUnsafe` does not;
Postgres resolved those bare table names against the connection's default
`search_path` (`public`), and every test run truncated the real dev
database instead of the isolated test schema. Baseline data was restored
from `prisma/seed.ts`; real accounts, orders, and everything built outside
that script were not recoverable.

`resetDatabase()` now has two independent layers of protection — see the
`INCIDENT` comment directly above it in `helpers.ts` for the exact fix and
why a live `current_schema()` check specifically does **not** work here
(verified empirically: the adapter's `schema` option never issues
`SET search_path` on the connection, so that call always reports `public`
regardless of `DATABASE_SCHEMA`). Any future change to that function
should be read against that comment before merging.

## What's covered

- `bidding.test.ts` — bid placement (valid bid, below-minimum rejection,
  concurrent-bid race resolution), proxy/max-bid auto-countering, and
  anti-snipe extension.
- `payment-verification.test.ts` — Razorpay signature verification
  (accept/reject/idempotent-replay) for `verify-payment`.
- `auth-gating.test.ts` — admin-only and approved-seller-only route
  gating (401/403/200 across no-token, wrong-role, and correct-role
  tokens).
