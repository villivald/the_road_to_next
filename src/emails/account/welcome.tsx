import { createText } from "@/i18n/text";
import {
  accountProfilePath,
  browsePath,
  newListPath,
  reservationsPath,
  sharedListsPath,
} from "@/paths";
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

export default function WelcomeEmail({
  toName,
  locale = "en",
}: {
  toName: string;
  locale?: string;
}) {
  const t = createText(locale);
  return (
    <EmailLayout
      locale={locale}
      title={t("Welcome to Wishlist")}
      preview={t("Create a list, add wishes, and share gift ideas.")}
    >
      <EmailParagraph>
        {t("Hi {name}, your account is ready. Let’s add your first wishes.", {
          name: toName,
        })}
      </EmailParagraph>
      <EmailAction href={emailUrl(newListPath, locale)}>
        {t("Create your first list")}
      </EmailAction>
      <EmailHeading>{t("Start with these three steps")}</EmailHeading>
      <EmailList
        ordered
        items={[
          <>
            <strong>{t("Make a list.")}</strong>{" "}
            {t(
              "Open My lists → Create list. Add wishes: only the name is required. Images, links, prices, notes, and stars are optional.",
            )}
          </>,
          <>
            <strong>{t("Show and share it.")}</strong>{" "}
            {t(
              "New lists start hidden. In List settings, choose Show list when ready, then share the link. Public lists also appear in Browse.",
            )}
          </>,
          <>
            <strong>{t("Let people reserve gifts.")}</strong>{" "}
            {t(
              "Turn on Allow reservations in List settings. A verified account is needed to reserve.",
            )}
          </>,
        ]}
      />
      <EmailNote>
        {t(
          "Public lists are visible to everyone. Hiding a list ends its active reservations.",
        )}
      </EmailNote>
      <EmailHeading>{t("Buying a gift for someone?")}</EmailHeading>
      <EmailParagraph>
        {t(
          "Find ideas in Browse. Reserve a wish to avoid duplicate gifts, then view or cancel it in My reservations. Reserving does not buy the item.",
        )}
      </EmailParagraph>
      <EmailParagraph>
        {t(
          "A reserved wish is visible only to you and the list admins. Your name stays private. If the wish or list becomes unavailable, the reservation ends.",
        )}
      </EmailParagraph>
      <EmailParagraph>
        <EmailLink href={emailUrl(browsePath, locale)}>
          {t("Browse wishlists")}
        </EmailLink>
        {" · "}
        <EmailLink href={emailUrl(reservationsPath, locale)}>
          {t("View my reservations")}
        </EmailLink>
      </EmailParagraph>
      <EmailDivider />
      <EmailHeading>{t("Make yourself at home")}</EmailHeading>
      <EmailList
        items={[
          <>
            <EmailLink href={emailUrl(accountProfilePath, locale)}>
              {t("Edit profile")}
            </EmailLink>
            {" — "}
            {t(
              "add a name, avatar, and introduction. Your email stays private.",
            )}
          </>,
          <>
            <EmailLink href={emailUrl(sharedListsPath, locale)}>
              {t("Lists shared with you")}
            </EmailLink>
            {" — "}
            {t(
              "accept an email invitation to join someone’s list with a Free account.",
            )}
          </>,
          <>
            <EmailLink href={emailUrl("/premium", locale)}>
              {t("Explore Premium features")}
            </EmailLink>
            {" — "}
            {t(
              "private sharing, guest links, and shared management. Only the list owner needs Premium.",
            )}
          </>,
        ]}
      />
    </EmailLayout>
  );
}
WelcomeEmail.PreviewProps = { toName: "Alex", locale: "en" };
