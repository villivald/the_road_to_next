import EmailInvitation from "@/emails/invitation/email-invitation";
import { resend } from "@/lib/resend";

export const sendEmailInvitation = async (
  username: string,
  organizationName: string,
  email: string,
  emailInvitationLink: string,
) => {
  return await resend.emails.send({
    from: "no-reply@create-react-app.com",
    to: email,
    subject: `Invitation to ${organizationName} from TicketBounty`,
    react: (
      <EmailInvitation
        fromUser={username}
        fromOrganization={organizationName}
        url={emailInvitationLink}
      />
    ),
  });
};
