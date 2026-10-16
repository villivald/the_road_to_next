import { createText } from "@/i18n/text";
import {
  EmailAction,
  EmailLayout,
  EmailLink,
  EmailNote,
  EmailParagraph,
} from "../components/layout";

type EmailPasswordResetProps = {
  toName: string;
  url: string;
  locale?: string;
};

const EmailPasswordReset = ({
  toName,
  url,
  locale = "en",
}: EmailPasswordResetProps) => {
  const t = createText(locale);
  return (
    <EmailLayout
      locale={locale}
      title={t("Reset your password")}
      preview={t("A single-use link to reset your Wishlist password.")}
    >
      <EmailParagraph>
        {t("Hi {name}, use the link below to reset your Wishlist password.", {
          name: toName,
        })}
      </EmailParagraph>
      <EmailAction href={url}>{t("Reset password")}</EmailAction>
      <EmailNote>
        {t("This link expires in 30 minutes and can be used once.")}
      </EmailNote>
      <EmailParagraph>
        {t("If the button does not work, open this link:")}
        <br />
        <EmailLink href={url}>{url}</EmailLink>
      </EmailParagraph>
      <EmailParagraph>
        {t(
          "If you did not request this, ignore this email. Your password will stay the same.",
        )}
      </EmailParagraph>
    </EmailLayout>
  );
};

EmailPasswordReset.PreviewProps = {
  toName: "John Doe",
  url: "http://localhost:3000/password-reset/abc",
};

export default EmailPasswordReset;
