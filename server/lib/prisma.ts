import { PrismaClient } from "#generated/client/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString:
    process.env["DATABASE_URL"] ??
    "postgresql://postgres:postgres@localhost:5432/sming?schema=public",
});

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function isCurrentPrismaClient(client: PrismaClient | undefined): client is PrismaClient {
  return Boolean(
    client &&
      "role" in client &&
      "permission" in client &&
      "rolePermission" in client,
  );
}

export const prisma = isCurrentPrismaClient(globalForPrisma.prisma)
  ? globalForPrisma.prisma
  : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
