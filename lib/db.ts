import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;

  // Next.js/Vercel builds import API routes without production env vars
  if (
    process.env.npm_lifecycle_event === "build" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    return "postgresql://build:build@localhost:5432/build";
  }

  throw new Error("DATABASE_URL is not set");
}

function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: resolveDatabaseUrl() });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/** Lazy Prisma client — avoids connecting during Next.js production builds. */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = client[prop as keyof PrismaClient];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});

if (process.env.NODE_ENV !== "production") {
  // Warm client in dev for faster first request (skipped during CI builds without DATABASE_URL)
  if (process.env.DATABASE_URL) {
    globalForPrisma.prisma = getPrismaClient();
  }
}
