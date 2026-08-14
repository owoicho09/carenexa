import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  // Cap connections per client instance — Vercel can run several warm serverless
  // instances at once, and each one's pool adds to Supabase's pooler connection budget.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 3 });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

// Reuse the client (and its connection pool) across invocations of the same warm
// instance instead of creating a fresh one each time — not just in dev, where this
// guards against HMR duplicating clients, but in production too, where it keeps
// connection count down.
globalForPrisma.prisma = db;
