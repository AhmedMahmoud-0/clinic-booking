import "server-only";
import { getPrismaClient } from "../db/client";

export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
