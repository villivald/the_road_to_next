import EmailVerification from "@/emails/auth/email-verification";
import { resend } from "@/lib/resend";

export const sendEmailVerification = async (
  username: string,
  email: string,
  verificationCode: string,
) => {
  return await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "TicketBounty <onboarding@resend.dev>",
    to: email,
    subject: "Email Verification",
    react: <EmailVerification toName={username} code={verificationCode} />,
  });
};
