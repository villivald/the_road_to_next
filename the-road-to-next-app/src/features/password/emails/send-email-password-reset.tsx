import EmailPasswordReset from "@/emails/password/email-password-reset";
import { createText } from "@/i18n/text";
import { deliverEmail } from "@/lib/mail";

export const sendEmailPasswordReset = async (
  username: string,
  email: string,
  url: string,
  locale = "en",
) =>
  deliverEmail(
    email,
    createText(locale)("Reset your Wishlist password"),
    <EmailPasswordReset toName={username} url={url} locale={locale} />,
  );
