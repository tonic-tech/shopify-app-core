import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __tonic_prisma: PrismaClient;
}

/**
 * Create a Prisma client singleton
 * Prevents multiple instances in development (HMR)
 */
export function createPrismaClient(): PrismaClient {
  const prisma = global.__tonic_prisma || new PrismaClient();

  if (process.env.NODE_ENV !== "production") {
    global.__tonic_prisma = prisma;
  }

  return prisma;
}
