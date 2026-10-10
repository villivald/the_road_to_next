import { Body, Container, Head, Html, Section, Text } from "react-email";
import { createText } from "@/i18n/text";

type EmailVerificationProps = {
  toName: string;
  code: string;
  locale?: string;
};

const EmailVerification = ({
  toName,
  code,
  locale = "en",
}: EmailVerificationProps) => {
  const t = createText(locale);
  return (
    <Html lang={locale}>
      <Head />
      <Body
        style={{
          margin: "32px",
          textAlign: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <Container>
          <Section>
            <Text>
              {t(
                "Hi {name}, enter this code in Wishlist to verify your email:",
                { name: toName },
              )}
            </Text>
          </Section>
          <Section>
            <Text>{code}</Text>
            <Text>
              {t("This code expires in 30 minutes. Use only your latest code.")}
            </Text>
            <Text>
              {t(
                "If you did not create a Wishlist account, you can ignore this email.",
              )}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

EmailVerification.PreviewProps = {
  toName: "John Doe",
  code: "CMAGLPOI",
};

export default EmailVerification;
