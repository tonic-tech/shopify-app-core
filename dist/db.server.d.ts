import { PrismaClient } from "@prisma/client";
declare global {
    var __tonic_prisma: PrismaClient;
}
/**
 * Create a Prisma client singleton
 * Prevents multiple instances in development (HMR)
 */
export declare function createPrismaClient(): PrismaClient;
//# sourceMappingURL=db.server.d.ts.map