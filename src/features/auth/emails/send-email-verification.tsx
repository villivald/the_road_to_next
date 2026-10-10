import EmailVerification from "@/emails/auth/email-verification";
import { createText } from "@/i18n/text";
import { deliverEmail } from "@/lib/mail";

export const sendEmailVerification = async (
  username: string,
  email: string,
  code: string,
  locale = "en",
) =>
  deliverEmail(
    email,
    createText(locale)("Verify your Wishlist email"),
    <EmailVerification toName={username} code={code} locale={locale} />,
  );
