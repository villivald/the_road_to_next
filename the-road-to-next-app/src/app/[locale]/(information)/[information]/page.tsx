import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import styles from "@/components/shell.module.css";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import { createText } from "@/i18n/text";

const contact = <a href="mailto:support@wishlist.fi">support@wishlist.fi</a>;
const creator = <a href="https://www.villivald.com/">villivald</a>;

const information = (
  t: ReturnType<typeof createText>,
): Record<string, { title: string; content: ReactNode }> => ({
  about: {
    title: t("About Wishlist"),
    content: (
      <>
        <p>
          {t(
            "Wishlist is a place to collect things you love and share gift ideas with your people. Create a list, add wishes, and choose who can see them.",
          )}
        </p>
        <h2>
          {t("Made by")} {creator}
        </h2>
        <p>
          {t("Questions, feedback, or something not working? Write to")}{" "}
          {contact}
          {t(
            ". Please do not send passwords, payment details, or private sharing links.",
          )}
        </p>
        <h2>{t("Design credits")}</h2>
        <ul>
          <li>
            {t("Colors inspired by")}{" "}
            <a href="https://www.happyhues.co/palettes/14">Happy Hues</a>.
          </li>
          <li>
            {t(
              "Manrope by the Manrope Project Authors, under the SIL Open Font License.",
            )}
          </li>
          <li>
            {t("Interface icons and the heart favicon from")}{" "}
            <a href="https://lucide.dev/">Lucide</a>.
          </li>
          <li>
            {t("Unmodified homepage illustrations by")}{" "}
            <a href="https://openmoji.org/">OpenMoji</a>
            {t(", licensed under")}{" "}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/">
              CC BY-SA 4.0
            </a>
            .
          </li>
        </ul>
      </>
    ),
  },
  accessibility: {
    title: t("Accessibility"),
    content: (
      <>
        <p>
          {t(
            "Wishlist aims to be usable with a keyboard, enlarged text, assistive technology, and on small screens. WCAG 2.2 AA guides the design.",
          )}
        </p>
        <h2>{t("Using the app")}</h2>
        <ul>
          <li>
            {t(
              "Press Tab to reveal “Skip to content” and move through links and controls.",
            )}
          </li>
          <li>
            {t(
              "Choose a light or dark theme using the theme button in the header.",
            )}
          </li>
          <li>
            {t(
              "Text and layouts support zoom; reduced-motion preferences are respected.",
            )}
          </li>
          <li>
            {t(
              "Images include a description for people using screen readers. When adding or replacing a wish image, its title is used if you leave the image description blank.",
            )}
          </li>
        </ul>
        <h2>{t("Testing and limitations")}</h2>
        <p>
          {t(
            "We test mobile and desktop layouts, keyboard navigation, zoom, and automated accessibility checks. A full screen-reader and browser review is still needed; we do not claim full accessibility conformance. Image descriptions are written by the person uploading them.",
          )}
        </p>
        <h2>{t("Report a barrier")}</h2>
        <p>
          {t("Send an email to")} {contact}.
        </p>
        <p>
          {t(
            "Tell us which page you were on, what you were trying to do, and which browser or assistive technology you use. Do not include private list links or other people’s personal information.",
          )}
        </p>
      </>
    ),
  },
  privacy: {
    title: t("Privacy and your data"),
    content: (
      <>
        <p>
          {t(
            "This page explains the current development preview. For privacy questions or requests about your data, email",
          )}{" "}
          {contact}.
        </p>
        <h2>{t("What others can see")}</h2>
        <ul>
          <li>
            {t(
              "Lists set to Visible · Anyone and their available wishes appear in Browse. Anyone can view them without an account.",
            )}
          </li>
          <li>
            {t(
              "When you own a list visible to anyone, your display name (or username), avatar, and “About you” appear in People. People can find you by display name or username. Your email is not shown.",
            )}
          </li>
          <li>
            {t(
              "Lists set to Visible · People with access require membership or an active guest link. Guest links allow viewing without an account until they expire or are revoked.",
            )}
          </li>
          <li>
            {t(
              "Hidden lists and hidden, fulfilled, or reserved wishes do not appear in Browse. Only the person who reserved a wish and list admins can view that reserved wish. The person’s identity stays private.",
            )}
          </li>
        </ul>
        <h2>{t("What the app stores")}</h2>
        <p>
          {t(
            "Account information, a password hash, session and recovery records, lists, wishes, uploaded images, memberships, invitations, reservations, and Premium records support the features you use. Account emails are delivered through the configured email service. The app does not store payment-card details; checkout is handled by Paddle when enabled.",
          )}
        </p>
        <h2>{t("Cookies and preferences")}</h2>
        <p>
          {t(
            "Cookies keep you signed in and remember access granted by a guest link. Your theme preference is stored in your browser. The app has no advertising or analytics tracking configured.",
          )}
        </p>
        <h2>{t("Your controls")}</h2>
        <p>
          {t(
            "Edit your profile or delete your account in Account. Use each list’s settings to hide it or manage guest links, and its edit pages to remove images. Hiding a list ends its active reservations.",
          )}
        </p>
        <p>
          {t(
            "Account deletion removes sign-in access and your profile. Shared lists may transfer to another admin or be archived; wishes you added can remain without your name. Payment records needed to resolve payments can remain without a linked profile.",
          )}
        </p>
        <p>
          {t(
            "The final hosting providers, retention periods, and production privacy notice will be confirmed before public launch.",
          )}
        </p>
      </>
    ),
  },
  terms: {
    title: t("Preview terms"),
    content: (
      <>
        <p>
          {t("Wishlist is a development preview by")} {creator}
          {t(
            ". These notes describe how to use this preview; production service and purchase terms will be reviewed before public launch. Contact",
          )}{" "}
          {contact} {t("with questions.")}
        </p>
        <h2>{t("Use it thoughtfully")}</h2>
        <ul>
          <li>
            {t(
              "Only upload content you are allowed to share. Do not share sensitive personal information about yourself or others.",
            )}
          </li>
          <li>
            {t(
              "Keep your password and private sharing links secure. Do not try to bypass access controls or interfere with other users.",
            )}
          </li>
          <li>
            {t(
              "Check who can see your list before choosing Show list. Lists set to Anyone can be viewed without an account and found in Browse.",
            )}
          </li>
        </ul>
        <h2>{t("Wishes and reservations")}</h2>
        <p>
          {t(
            "A reservation helps people coordinate a gift. It does not buy an item, guarantee availability, or create a transaction between users. Product links lead to external websites whose prices and terms may change.",
          )}
        </p>
        <h2>{t("Premium and the preview")}</h2>
        <p>
          {t(
            "Current payment testing uses Paddle sandbox; sandbox transactions do not charge money. Real payments are not enabled for this preview. Features and availability may change during development, so keep your own copy of information you need.",
          )}
        </p>
        <h2>{t("Deleting your account")}</h2>
        <p>
          {t(
            "You can delete your account in settings. Review the deletion summary to see what happens to shared lists and reservations before confirming.",
          )}
        </p>
      </>
    ),
  },
  "site-map": {
    title: t("Site map"),
    content: (
      <>
        <h2>{t("Explore")}</h2>
        <ul>
          <li>
            <Link href="/">{t("Welcome")}</Link>
          </li>
          <li>
            <Link href="/browse">{t("Public wishlists")}</Link>
          </li>
          <li>
            <Link href="/browse?view=wishes">{t("Available wishes")}</Link>
          </li>
          <li>
            <Link href="/browse?view=users">{t("People")}</Link>
          </li>
        </ul>
        <h2>{t("Your space")}</h2>
        <ul>
          <li>
            <Link href="/lists">{t("Your wishlists")}</Link>
          </li>
          <li>
            <Link href="/lists/shared">{t("Lists shared with you")}</Link>
          </li>
          <li>
            <Link href="/reservations">{t("Your reservations")}</Link>
          </li>
          <li>
            <Link href="/account/profile">{t("Profile and settings")}</Link>
          </li>
          <li>
            <Link href="/sign-in">{t("Sign in")}</Link>
          </li>
          <li>
            <Link href="/sign-up">{t("Create an account")}</Link>
          </li>
        </ul>
        <h2>{t("Information")}</h2>
        <ul>
          <li>
            <Link href="/about">{t("About and contact")}</Link>
          </li>
          <li>
            <Link href="/accessibility">{t("Accessibility")}</Link>
          </li>
          <li>
            <Link href="/privacy">{t("Privacy")}</Link>
          </li>
          <li>
            <Link href="/terms">{t("Preview terms")}</Link>
          </li>
        </ul>
      </>
    ),
  },
});

const readInformation = (name: string, t: ReturnType<typeof createText>) => {
  const pages = information(t);
  if (!Object.hasOwn(pages, name)) notFound();
  return pages[name];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ information: string }>;
}): Promise<Metadata> {
  const page = readInformation((await params).information, await getText());
  return { title: page.title, robots: { index: false, follow: false } };
}

export default async function InformationPage({
  params,
}: {
  params: Promise<{ information: string }>;
}) {
  const page = readInformation((await params).information, await getText());
  return (
    <article className={styles["information-page"]}>
      <h1>{page.title}</h1>
      {page.content}
    </article>
  );
}
