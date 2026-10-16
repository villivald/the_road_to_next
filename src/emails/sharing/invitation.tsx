import { createText } from "@/i18n/text";
import {
  EmailAction,
  EmailLayout,
  EmailLink,
  EmailParagraph,
} from "../components/layout";

export default function InvitationEmail({
  url,
  locale = "en",
}: {
  url: string;
  locale?: string;
}) {
  const t = createText(locale);
  return (
    <EmailLayout
      locale={locale}
      title={t("Your Wishlist invitation")}
      preview={t("You have been invited to a list on Wishlist.")}
    >
      <EmailParagraph>
        {t("You have been invited to a list on Wishlist.")}
      </EmailParagraph>
      <EmailParagraph>
        {t(
          "Sign in or create an account with this email address and verify it. Then review the invitation and choose whether to join. The invitation expires after seven days.",
        )}
      </EmailParagraph>
      <EmailAction href={url}>{t("Review invitation")}</EmailAction>
      <EmailParagraph>
        {t("If the button does not work, open this link:")}
        <br />
        <EmailLink href={url}>{url}</EmailLink>
      </EmailParagraph>
      <EmailParagraph>
        {t("If you were not expecting this invitation, you can ignore it.")}
      </EmailParagraph>
    </EmailLayout>
  );
}

InvitationEmail.PreviewProps = {
  url: "http://localhost:3000/invitations/example",
};
