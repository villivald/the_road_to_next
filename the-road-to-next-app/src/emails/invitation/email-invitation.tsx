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

type EmailInvitationProps = {
  fromUser: string;
  fromOrganization: string;
  url: string;
};

const EmailInvitation = ({
  fromUser,
  fromOrganization,
  url,
}: EmailInvitationProps) => {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="m-8 text-center font-sans">
          <Container>
            <Section>
              <Text>
                Hello there, {fromUser} invited you to join {fromOrganization}.
                Click the link below to accept the invitation.
              </Text>
            </Section>
            <Section>
              <Button
                href={url}
                className="m-2 rounded bg-black p-2 text-white"
              >
                Accept Invitation
              </Button>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

EmailInvitation.PreviewProps = {
  fromUser: "John Doe",
  fromOrganization: "John Doe Inc",
  url: "http://localhost:3000/email-invitation/abc123",
} as EmailInvitationProps;

export default EmailInvitation;
