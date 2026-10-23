import { sendEmailPasswordReset } from "@/features/password/emails/send-email-password-reset";
import { generatePasswordResetLink } from "@/features/password/utils/generate-password-reset-link";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/utils/crypto";
import { sendEmailVerification } from "../emails/send-email-verification";
import { generateEmailVerificationCode } from "../utils/generate-email-verification-code";
import { AuthError, consumeRateLimit } from "./security";

// Shared by initial verification, verification resend, and password recovery.
// A rejected reservation rolls back all counters and never rotates a token.
export const reserveAccountEmail = async (recipient: string) => {
  const email = recipient.trim().toLowerCase();
  const key = hashToken(`account-email-cooldown:${email}`);
  const now = Date.now();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.authRateLimit.upsert({
        where: { key },
        create: { key, attempts: 0, expiresAt: new Date(0) },
        update: { attempts: { increment: 0 } },
      });
      const reserved = await tx.authRateLimit.updateMany({
        where: { key, expiresAt: { lte: new Date(now) } },
        data: { attempts: 1, expiresAt: new Date(now + 60_000) },
      });
      if (reserved.count !== 1) throw new AuthError("Email cooldown");
      await consumeRateLimit("account-email-hour", email, 3, 3_600_000, tx);
      await consumeRateLimit("account-email-day", email, 8, 86_400_000, tx);
    });
    return true;
  } catch (error) {
    if (error instanceof AuthError) return false;
    throw error;
  }
};

export const requestVerificationEmail = async (user: {
  id: string;
  email: string;
  username: string;
  locale: string;
}) => {
  if (!(await reserveAccountEmail(user.email))) return false;
  const code = await generateEmailVerificationCode(user.id, user.email);
  await sendEmailVerification(user.username, user.email, code, user.locale);
  return true;
};

export const requestPasswordRecovery = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  // Unknown requests use the action's request limits but cannot consume a future
  // signup's sending budget. All outcomes retain the same public response.
  if (!(await reserveAccountEmail(user.email))) return;
  const url = await generatePasswordResetLink(user.id, user.locale);
  await sendEmailPasswordReset(user.username, user.email, url, user.locale);
};
