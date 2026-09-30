import { inngest, signedUp } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { sendEmailVerification } from "../emails/send-email-verification";
import { generateEmailVerificationCode } from "../utils/generate-email-verification-code";

export const emailVerificationEvent = inngest.createFunction(
  { id: "email-verification", triggers: [signedUp] },
  async ({ event }) => {
    const user = await prisma.user.findUnique({
      where: { id: event.data.userId },
    });
    if (!user || user.emailVerified) {
      return { skipped: true };
    }
    const code = await generateEmailVerificationCode(user.id, user.email);
    await sendEmailVerification(user.username, user.email, code);
    return { sent: true };
  },
);
