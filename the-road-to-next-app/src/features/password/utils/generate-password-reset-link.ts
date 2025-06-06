import { prisma } from "@/lib/prisma";
import { passwordResetPath } from "@/paths";
import { generateRandomToken, hashToken } from "@/utils/crypto";
import { getBaseUrl } from "@/utils/url";

const PASSWORD_RESET_TOKEN_LIFETIME_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

export const generatePasswordResetLink = async (userId: string) => {
  await prisma.passwordResetToken.deleteMany({
    where: {
      userId,
    },
  });

  const tokenId = generateRandomToken();
  const tokenHash = hashToken(tokenId);

  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_LIFETIME_MS),
    },
  });

  const pageUrl = getBaseUrl() + passwordResetPath;
  const passwordResetLink = pageUrl + `${tokenId}`;

  return passwordResetLink;
};
