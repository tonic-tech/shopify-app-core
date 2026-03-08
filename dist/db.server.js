import { PrismaClient } from "@prisma/client";
/**
 * Create a Prisma client singleton
 * Prevents multiple instances in development (HMR)
 */
export function createPrismaClient() {
    const prisma = global.__tonic_prisma || new PrismaClient();
    if (process.env.NODE_ENV !== "production") {
        global.__tonic_prisma = prisma;
    }
    return prisma;
}
//# sourceMappingURL=db.server.js.map