import { Text } from "react-email";
import { createText } from "@/i18n/text";
import { EmailLayout, EmailNote, EmailParagraph } from "../components/layout";

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
    <EmailLayout
      locale={locale}
      title={t("Verify your email")}
      preview={t(
        "Enter this code in Wishlist to finish creating your account.",
      )}
    >
      <EmailParagraph>
        {t("Hi {name}, enter this code in Wishlist to verify your email:", {
          name: toName,
        })}
      </EmailParagraph>
      <Text
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: "30px",
          fontWeight: 700,
          letterSpacing: "3px",
          textAlign: "center",
          padding: "18px 8px",
          backgroundColor: "#eeebe1",
          color: "#292731",
          borderRadius: "4px",
          margin: "20px 0",
        }}
      >
        {code}
      </Text>
      <EmailNote>
        {t("This code expires in 30 minutes. Use only your latest code.")}
      </EmailNote>
      <EmailParagraph>
        {t(
          "If you did not create a Wishlist account, you can ignore this email.",
        )}
      </EmailParagraph>
    </EmailLayout>
  );
};

EmailVerification.PreviewProps = {
  toName: "John Doe",
  code: "CMAGLPOI",
};

export default EmailVerification;
