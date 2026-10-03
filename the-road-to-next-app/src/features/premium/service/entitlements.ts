import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { continuousPremiumUntil } from "./period";

export class PremiumError extends Error {}

export const readPremiumAccess = async (
  userId: string,
  db: Prisma.TransactionClient = prisma,
) => {
  const now = new Date();
  const periods = await db.premiumGrant.findMany({
    where: {
      userId,
      user: { emailVerified: true },
      revokedAt: null,
      expiresAt: { gt: now },
    },
    select: { startsAt: true, expiresAt: true },
    orderBy: { startsAt: "asc" },
  });
  const expiresAt = continuousPremiumUntil(periods, now);

  return {
    plan: expiresAt ? ("PREMIUM" as const) : ("FREE" as const),
    expiresAt,
    nextStartsAt: expiresAt
      ? null
      : (periods.find((period) => period.startsAt > now)?.startsAt ?? null),
  };
};

export const requirePremium = async (
  userId: string,
  db: Prisma.TransactionClient = prisma,
) => {
  const access = await readPremiumAccess(userId, db);

  if (access.plan !== "PREMIUM") {
    throw new PremiumError(
      "Active Premium access is required for this action.",
    );
  }
  return access;
};
