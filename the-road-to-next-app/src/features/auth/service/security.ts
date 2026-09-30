import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/utils/crypto";

export class AuthError extends Error {}

export const consumeRateLimit = async (
  scope: string,
  identity: string,
  limit: number,
  windowMs: number,
) => {
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const key = hashToken(`${scope}:${identity}:${windowStart}`);
  const result = await prisma.authRateLimit.upsert({
    where: { key },
    create: { key, attempts: 1, expiresAt: new Date(windowStart + windowMs) },
    update: { attempts: { increment: 1 } },
  });
  if (result.attempts > limit) {
    throw new AuthError("Too many attempts. Please try again later.");
  }
};

export const lockUser = async (
  tx: Prisma.TransactionClient,
  userId: string,
) => {
  const schema =
    new URL(process.env.DATABASE_URL!).searchParams.get("schema") ?? "public";
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    throw new Error("Invalid database schema");
  }
  const table = Prisma.raw(`"${schema}"."User"`);
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM ${table} WHERE "id" = ${userId} FOR UPDATE`,
  );
};
