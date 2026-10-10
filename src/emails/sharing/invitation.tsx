import { Body, Container, Head, Html, Link, Text } from "react-email";
import { createText } from "@/i18n/text";

export default function InvitationEmail({
  url,
  locale = "en",
}: {
  url: string;
  locale?: string;
}) {
  const t = createText(locale);
  return (
    <Html lang={locale}>
      <Head />
      <Body style={{ fontFamily: "Arial, sans-serif", padding: "24px" }}>
        <Container>
          <Text>{t("You have been invited to a list on Wishlist.")}</Text>
          <Text>
            {t(
              "Sign in or create an account with this email address and verify it. Then review the invitation and choose whether to join. The invitation expires after seven days.",
            )}
          </Text>
          <Link href={url}>{t("Review invitation")}</Link>
          <Text>
            {t("If you were not expecting this invitation, you can ignore it.")}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

InvitationEmail.PreviewProps = {
  url: "http://localhost:3000/invitations/example",
};
