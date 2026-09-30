import { prisma } from "@/lib/prisma";
import { generateRandomCode, hashToken } from "@/utils/crypto";
import { lockUser } from "../service/security";

export const generateEmailVerificationCode = async (
  userId: string,
  email: string,
) => {
  const code = generateRandomCode();

  await prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    await tx.emailVerificationToken.upsert({
      where: { userId },
      create: {
        userId,
        email,
        codeHash: hashToken(code),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
      update: {
        email,
        codeHash: hashToken(code),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
  });
  return code;
};
