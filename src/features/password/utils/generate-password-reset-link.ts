import { lockUser } from "@/features/auth/service/security";
import { localizedPath } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { passwordResetPath } from "@/paths";
import { generateRandomToken, hashToken } from "@/utils/crypto";
import { getBaseUrl } from "@/utils/url";

export const generatePasswordResetLink = async (
  userId: string,
  locale = "en",
) => {
  const token = generateRandomToken();

  await prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);

    await tx.passwordResetToken.upsert({
      where: { userId },
      create: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
      update: {
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
  });
  return `${getBaseUrl()}${localizedPath(`${passwordResetPath}${token}`, locale)}`;
};
