import EmailVerification from "@/emails/auth/email-verification";
import { deliverEmail } from "@/lib/mail";

export const sendEmailVerification = async (
  username: string,
  email: string,
  code: string,
) =>
  deliverEmail(
    email,
    "Verify your Wishlist email",
    <EmailVerification toName={username} code={code} />,
  );
