import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { withExplicitNeonTls } from "./database-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const connectionString = withExplicitNeonTls(process.env.DATABASE_URL);

const schema = connectionString
  ? (new URL(connectionString).searchParams.get("schema") ?? "public")
  : "public";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }, { schema }),
  });
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
