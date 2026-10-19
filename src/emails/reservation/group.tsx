import { createText } from "@/i18n/text";
import {
  EmailAction,
  EmailLayout,
  EmailLink,
  EmailParagraph,
} from "../components/layout";

export default function GroupEmail({
  kind = "INVITED",
  actorName = "Alex",
  url = "http://localhost:3000/en/reservations/example",
  locale = "en",
}: {
  kind?: "INVITED" | "ACCEPTED";
  actorName?: string;
  url?: string;
  locale?: string;
}) {
  const t = createText(locale);
  const invited = kind === "INVITED";
  const title = t(invited ? "Group invitation" : "Invitation accepted");
  const preview = t(
    invited
      ? "You're invited to a group reservation"
      : "Someone joined your group reservation",
  );
  return (
    <EmailLayout locale={locale} title={title} preview={preview}>
      <EmailParagraph>
        {t(
          invited
            ? "{name} invited you to reserve a gift together on Wishlist."
            : "{name} accepted your group reservation invitation.",
          { name: actorName },
        )}
      </EmailParagraph>
      <EmailParagraph>
        {t(
          invited
            ? "Sign in to the account this email belongs to, review the invitation, and choose whether to join. Invitations expire seven days after they are created. Joining shares your name and username with the group. No payment is collected."
            : "Open the group to see its current members and coordinate the gift. No payment is collected.",
        )}
      </EmailParagraph>
      <EmailAction href={url}>
        {t(invited ? "Review invitation" : "Manage group reservation")}
      </EmailAction>
      <EmailParagraph>
        {t("If the button does not work, open this link:")}
        <br />
        <EmailLink href={url}>{url}</EmailLink>
      </EmailParagraph>
      {invited && (
        <EmailParagraph>
          {t("If you were not expecting this invitation, you can ignore it.")}
        </EmailParagraph>
      )}
    </EmailLayout>
  );
}
