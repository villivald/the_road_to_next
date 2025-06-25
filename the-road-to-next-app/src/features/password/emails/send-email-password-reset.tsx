import EmailPasswordReset from "@/emails/password/email-password-reset";
import { resend } from "@/lib/resend";

export const sendEmailPasswordReset = async (
  username: string,
  email: string,
  passwordResetLink: string,
) => {
  return await resend.emails.send({
    from: "no-reply@create-react-app.com",
    to: email,
    subject: "Password Reset Request",
    react: <EmailPasswordReset toName={username} url={passwordResetLink} />,
  });
};
