import {
  hashPassword,
  verifyPasswordHash,
} from "@/features/password/utils/hash-and-verify";
import { createSession } from "@/lib/lucia";
import { prisma } from "@/lib/prisma";
import { generateRandomToken, hashToken } from "@/utils/crypto";
import { AuthError, lockUser } from "./security";

export const authenticate = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Perform password work for unknown accounts too.
  if (!user) {
    await hashPassword(password);
    throw new AuthError("Incorrect email or password");
  }

  if (!(await verifyPasswordHash(user.passwordHash, password))) {
    throw new AuthError("Incorrect email or password");
  }

  const token = generateRandomToken();

  const session = await prisma.$transaction(async (tx) => {
    await lockUser(tx, user.id);

    const current = await tx.user.findUnique({ where: { id: user.id } });
    if (!current || current.passwordHash !== user.passwordHash) {
      throw new AuthError("Please sign in again");
    }

    return createSession(token, user.id, tx);
  });

  return { user, token, session };
};

export const register = async (input: {
  username: string;
  email: string;
  password: string;
}) => {
  const passwordHash = await hashPassword(input.password);
  const token = generateRandomToken();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { username: input.username, email: input.email, passwordHash },
    });
    const session = await createSession(token, user.id, tx);

    return { user, token, session };
  });
};

export const verifyEmail = async (
  userId: string,
  email: string,
  code: string,
) => {
  const token = generateRandomToken();

  const session = await prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.email !== email) {
      throw new AuthError("Please sign in again");
    }

    const consumed = await tx.emailVerificationToken.deleteMany({
      where: {
        userId,
        email,
        codeHash: hashToken(code),
        expiresAt: { gt: new Date() },
      },
    });
    if (consumed.count !== 1) {
      throw new AuthError("Invalid or expired code");
    }

    await tx.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
    await tx.session.deleteMany({ where: { userId } });

    return createSession(token, userId, tx);
  });

  return { token, session };
};

export const resetPassword = async (rawToken: string, password: string) => {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });
  if (!token || token.expiresAt.getTime() <= Date.now()) {
    throw new AuthError("Token is invalid or expired");
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    await lockUser(tx, token.userId);

    const consumed = await tx.passwordResetToken.deleteMany({
      where: { tokenHash, expiresAt: { gt: new Date() } },
    });
    if (consumed.count !== 1) {
      throw new AuthError("Token is invalid or expired");
    }

    await tx.user.update({
      where: { id: token.userId },
      data: { passwordHash },
    });
    await tx.session.deleteMany({ where: { userId: token.userId } });
  });
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  password: string,
) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPasswordHash(user.passwordHash, currentPassword))) {
    throw new AuthError("Incorrect current password");
  }

  const passwordHash = await hashPassword(password);
  const token = generateRandomToken();

  const session = await prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);

    const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (current.passwordHash !== user.passwordHash) {
      throw new AuthError("Your password changed. Please sign in again.");
    }

    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });

    return createSession(token, userId, tx);
  });

  return { token, session };
};
