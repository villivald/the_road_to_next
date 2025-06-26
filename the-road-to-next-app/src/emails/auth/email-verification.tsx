import {
  Body,
  Container,
  Head,
  Html,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

type EmailVerificationProps = {
  toName: string;
  code: string;
};

const EmailVerification = ({ toName, code }: EmailVerificationProps) => {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="m-8 text-center font-sans">
          <Container>
            <Section>
              <Text>
                Hi {toName}, please verify your email address by entering the
                code below:
              </Text>
            </Section>
            <Section>
              <Text>{code}</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

EmailVerification.PreviewProps = {
  toName: "John Doe",
  code: "CMAGLPOI",
};

export default EmailVerification;
