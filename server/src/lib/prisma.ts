import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// DATABASE_SCHEMA lets the test suite point this exact same adapter at a
// separate Postgres schema (see tests/README.md) instead of the default
// "public" — unset in normal dev/prod, where this is a no-op.
const adapter = new PrismaPg(
  { connectionString: process.env.DATABASE_URL },
  process.env.DATABASE_SCHEMA ? { schema: process.env.DATABASE_SCHEMA } : undefined,
)

export const prisma = new PrismaClient({ adapter })
