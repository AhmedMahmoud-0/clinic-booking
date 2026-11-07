import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma/client";
import { getServerEnvironment } from "../env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

let prismaClient: PrismaClient | undefined;

function createPrismaClient(): PrismaClient {
  const environment = getServerEnvironment();

  if (!environment.available) {
    throw new Error("Database configuration is unavailable.");
  }

  // A small pool is sufficient for this single-branch application. The bounded
  // connection timeout prevents requests from waiting indefinitely for a slot.
  const adapter = new PrismaPg({
    connectionString: environment.databaseUrl,
    max: 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
  });

  return new PrismaClient({ adapter });
}

export function getPrismaClient(): PrismaClient {
  if (prismaClient) {
    return prismaClient;
  }

  if (process.env.NODE_ENV !== "production" && globalForPrisma.prisma) {
    prismaClient = globalForPrisma.prisma;
    return prismaClient;
  }

  prismaClient = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaClient;
  }

  return prismaClient;
}
