import { languageTag } from "@/i18n/config";
import { createText } from "@/i18n/text";
import { accountPlanPath, listsPath } from "@/paths";
import {
  EmailAction,
  EmailDivider,
  EmailHeading,
  EmailLayout,
  EmailLink,
  EmailList,
  EmailNote,
  EmailParagraph,
  emailUrl,
} from "../components/layout";

export type PremiumEmailProps = {
  toName: string;
  locale?: string;
  source: "month" | "year" | "promo";
  startsAt: string;
  expiresAt: string;
};
export default function PremiumEmail({
  toName,
  locale = "en",
  source,
  startsAt,
  expiresAt,
}: PremiumEmailProps) {
  const t = createText(locale);
  const date = (value: string) =>
    new Intl.DateTimeFormat(languageTag(locale), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Helsinki",
    }).format(new Date(value));
  const promo = source === "promo";
  return (
    <EmailLayout
      locale={locale}
      title={t(
        promo ? "Your Premium access has been updated" : "Welcome to Premium",
      )}
      preview={t(
        "Private lists, invitations, guest links, and shared management.",
      )}
    >
      <EmailParagraph>
        {t("Hi {name}, thank you for choosing Wishlist Premium.", {
          name: toName,
        })}
      </EmailParagraph>
      <EmailNote tone="muted">
        <strong>
          {t(
            promo
              ? "Premium from a promo code"
              : source === "year"
                ? "Annual subscription"
                : "Monthly subscription",
          )}
        </strong>
        <br />
        {!promo && (
          <>
            {t("Payment confirmed.")}
            <br />
          </>
        )}
        {t(
          promo
            ? "Added access: {start} – {end} (Finland time)."
            : "Paid period: {start} – {end} (Finland time).",
          { start: date(startsAt), end: date(expiresAt) },
        )}
      </EmailNote>
      <EmailHeading>{t("Your Premium tools")}</EmailHeading>
      <EmailList
        items={[
          <>
            <strong>{t("Private lists.")}</strong>{" "}
            {t(
              "In List settings → Visibility and access, choose Limit access. Only invited members and people with a guest link can view a shown list.",
            )}
          </>,
          <>
            <strong>{t("Email invitations.")}</strong>{" "}
            {t(
              "Open Sharing and members to invite people. They accept the email invitation with a Free verified account and can reserve gifts when allowed.",
            )}
          </>,
          <>
            <strong>{t("Guest links.")}</strong>{" "}
            {t(
              "Use Manage guest links for view-only access without an account. Anyone with the link can view a shown list until the link expires or you disable it.",
            )}
          </>,
          <>
            <strong>{t("Shared management.")}</strong>{" "}
            {t(
              "Make trusted members admins in Sharing and members. They can manage wishes, list settings, and sharing.",
            )}
          </>,
        ]}
      />
      <EmailNote>
        {t(
          "Only the list owner needs Premium. New lists start hidden; choose Show list when ready. Guests cannot reserve or edit wishes.",
        )}
      </EmailNote>
      <EmailAction href={emailUrl(listsPath, locale)}>
        {t("Open My lists")}
      </EmailAction>
      <EmailDivider />
      <EmailHeading>{t("Manage your access")}</EmailHeading>
      <EmailList
        items={
          promo
            ? [
                t(
                  "Promo access does not renew automatically. Added days may start later if you already have Premium.",
                ),
                t(
                  "Promo codes never create charges or cancel a paid subscription.",
                ),
              ]
            : [
                t(
                  "In your plan, choose Manage subscription to update your payment method or cancel in Paddle.",
                ),
                t(
                  "Subscriptions renew automatically until canceled. End-of-period cancellation keeps Premium through the paid period.",
                ),
              ]
        }
      />
      <EmailParagraph>
        {t(
          "When Premium ends, your lists, members, and active guest links stay. New private sharing and admin assignments require Premium.",
        )}
      </EmailParagraph>
      <EmailParagraph>
        <EmailLink href={emailUrl(accountPlanPath, locale)}>
          {t("Your plan and promo codes")}
        </EmailLink>
        {" · "}
        <EmailLink href={emailUrl("/premium", locale)}>
          {t("Read the Premium guide")}
        </EmailLink>
      </EmailParagraph>
    </EmailLayout>
  );
}
PremiumEmail.PreviewProps = {
  toName: "Alex",
  locale: "en",
  source: "month",
  startsAt: "2026-10-14T12:00:00Z",
  expiresAt: "2026-11-14T12:00:00Z",
} satisfies PremiumEmailProps;
