import { Body, Container, Head, Html, Section, Text } from "react-email";

type EmailVerificationProps = {
  toName: string;
  code: string;
};

const EmailVerification = ({ toName, code }: EmailVerificationProps) => {
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
              Hi {toName}, enter this code in Wishlist to verify your email:
            </Text>
          </Section>
          <Section>
            <Text>{code}</Text>
            <Text>
              This code expires in 30 minutes. Use only your latest code.
            </Text>
            <Text>
              If you did not create a Wishlist account, you can ignore this
              email.
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
