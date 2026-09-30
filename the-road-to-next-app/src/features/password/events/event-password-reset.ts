import { inngest, passwordResetRequested } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { sendEmailPasswordReset } from "../emails/send-email-password-reset";
import { generatePasswordResetLink } from "../utils/generate-password-reset-link";

export const passwordResetEvent = inngest.createFunction(
  { id: "password-reset", triggers: [passwordResetRequested] },
  async ({ event }) => {
    const user = await prisma.user.findUnique({
      where: { id: event.data.userId },
    });
    if (!user) {
      return { skipped: true };
    }
    const url = await generatePasswordResetLink(user.id);
    await sendEmailPasswordReset(user.username, user.email, url);
    return { sent: true };
  },
);
