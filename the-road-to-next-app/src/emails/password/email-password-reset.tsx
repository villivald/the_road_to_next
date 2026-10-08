import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Section,
  Text,
} from "react-email";

type EmailPasswordResetProps = {
  toName: string;
  url: string;
};

const EmailPasswordReset = ({ toName, url }: EmailPasswordResetProps) => {
  return (
    <Html>
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
              Hi {toName}, use the link below to reset your Wishlist password.
            </Text>
          </Section>
          <Section>
            <Button
              style={{
                margin: "8px",
                borderRadius: "8px",
                backgroundColor: "#ffd803",
                padding: "12px 20px",
                color: "#272343",
              }}
              href={url}
            >
              Reset password
            </Button>
            <Text>This link expires in 30 minutes and can be used once.</Text>
            <Text>
              If you did not request this, ignore this email. Your password will
              stay the same.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

EmailPasswordReset.PreviewProps = {
  toName: "John Doe",
  url: "http://localhost:3000/password-reset/abc",
};

export default EmailPasswordReset;
