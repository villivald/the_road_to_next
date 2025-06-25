import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

type EmailPasswordResetProps = {
  toName: string;
  url: string;
};

const EmailPasswordReset = ({ toName, url }: EmailPasswordResetProps) => {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="m-8 text-center font-sans">
          <Container>
            <Section>
              <Text>
                Hi {toName}, you have requested a password reset for your
                account. Please click the button below to reset your password:
              </Text>
            </Section>
            <Section>
              <Button
                className="m-2 rounded bg-black p-2 text-white"
                href={url}
              >
                Reset Password
              </Button>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

EmailPasswordReset.PreviewProps = {
  toName: "John Doe",
  url: "http://localhost:3000/password-reset/abc",
};

export default EmailPasswordReset;
