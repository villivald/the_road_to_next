import type { Prisma } from "@/generated/prisma/client";
import { hashToken } from "@/utils/crypto";
import { prisma } from "./prisma";

// Fixed lifetime keeps database and browser expiry aligned without writes during rendering.
export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export const createSession = async (
  token: string,
  userId: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.session.create({
    data: {
      id: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
    },
  });

export const validateSession = async (token: string) => {
  const result = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: {
      user: {
        select: { id: true, username: true, email: true, emailVerified: true },
      },
    },
  });
  if (!result) {
    return { user: null, session: null };
  }
  if (result.expiresAt.getTime() <= Date.now()) {
    await prisma.session.deleteMany({ where: { id: result.id } });
    return { user: null, session: null };
  }
  const { user, ...session } = result;
  return { user, session };
};

export const invalidateSession = async (id: string) =>
  prisma.session.deleteMany({ where: { id } });
