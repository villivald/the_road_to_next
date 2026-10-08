import { Body, Container, Head, Html, Link, Text } from "react-email";

export default function InvitationEmail({ url }: { url: string }) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "Arial, sans-serif", padding: "24px" }}>
        <Container>
          <Text>You have been invited to a list on Wishlist.</Text>
          <Text>
            Sign in or create an account with this email address and verify it.
            Then review the invitation and choose whether to join. The
            invitation expires after seven days.
          </Text>
          <Link href={url}>Review invitation</Link>
          <Text>
            If you were not expecting this invitation, you can ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

InvitationEmail.PreviewProps = {
  url: "http://localhost:3000/invitations/example",
};
