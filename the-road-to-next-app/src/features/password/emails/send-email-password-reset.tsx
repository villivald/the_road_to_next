import EmailPasswordReset from "@/emails/password/email-password-reset";
import { deliverEmail } from "@/lib/mail";

export const sendEmailPasswordReset = async (
  username: string,
  email: string,
  url: string,
) =>
  deliverEmail(
    email,
    "Reset your Wishlist password",
    <EmailPasswordReset toName={username} url={url} />,
  );
