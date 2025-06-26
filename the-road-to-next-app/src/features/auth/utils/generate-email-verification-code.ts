import { prisma } from "@/lib/prisma";
import { generateRandomCode } from "@/utils/crypto";

const EMAIL_VERIFICATION_CODE_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours

export const generateEmailVerificationCode = async (
  userId: string,
  email: string,
) => {
  await prisma.emailVerificationToken.deleteMany({
    where: {
      userId,
    },
  });

  const code = generateRandomCode();

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      email,
      code,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_CODE_LIFETIME_MS),
    },
  });

  return code;
};
