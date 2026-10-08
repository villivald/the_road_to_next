import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import styles from "@/components/shell.module.css";

const contact = <a href="mailto:support@wishlist.fi">support@wishlist.fi</a>;
const creator = <a href="https://www.villivald.com/">villivald</a>;

const information: Record<string, { title: string; content: ReactNode }> = {
  about: {
    title: "About Wishlist",
    content: (
      <>
        <p>
          Wishlist is a place to collect things you love and share gift ideas
          with your people. Create a list, add wishes, and choose who can see
          them.
        </p>
        <h2>Made by {creator}</h2>
        <p>
          Questions, feedback, or something not working? Write to {contact}.
          Please do not send passwords, payment details, or private sharing
          links.
        </p>
        <h2>Design credits</h2>
        <ul>
          <li>
            Colors inspired by{" "}
            <a href="https://www.happyhues.co/palettes/14">
              Happy Hues palette 14
            </a>
            .
          </li>
          <li>
            Manrope by the Manrope Project Authors, under the SIL Open Font
            License.
          </li>
          <li>
            Interface icons and the heart favicon from{" "}
            <a href="https://lucide.dev/">Lucide</a>.
          </li>
          <li>
            Unmodified homepage illustrations by{" "}
            <a href="https://openmoji.org/">OpenMoji</a>, licensed under{" "}
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
    title: "Accessibility",
    content: (
      <>
        <p>
          Wishlist aims to be usable with a keyboard, enlarged text, assistive
          technology, and on small screens. WCAG 2.2 AA guides the design.
        </p>
        <h2>Using the app</h2>
        <ul>
          <li>
            Press Tab to reveal “Skip to content” and move through links and
            controls.
          </li>
          <li>
            Choose a light or dark theme using the theme button in the header.
          </li>
          <li>
            Text and layouts support zoom; reduced-motion preferences are
            respected.
          </li>
          <li>
            Images include a description for people using screen readers. When
            adding or replacing a wish image, its title is used if you leave the
            image description blank.
          </li>
        </ul>
        <h2>Testing and limitations</h2>
        <p>
          We test mobile and desktop layouts, keyboard navigation, zoom, and
          automated accessibility checks. A full screen-reader and browser
          review is still needed; we do not claim full accessibility
          conformance. Image descriptions are written by the person uploading
          them.
        </p>
        <h2>Report a barrier</h2>
        <p>
          Email {contact} with the page, what you were trying to do, and your
          browser or assistive technology. Avoid including private list links or
          other people’s information.
        </p>
      </>
    ),
  },
  privacy: {
    title: "Privacy and your data",
    content: (
      <>
        <p>
          This page explains the current development preview. For privacy
          questions or requests about your data, email {contact}.
        </p>
        <h2>What others can see</h2>
        <ul>
          <li>
            Lists set to Visible · Anyone and their available wishes appear in
            Browse. Anyone can view them without an account.
          </li>
          <li>
            When you own a list visible to anyone, your display name (or
            username), avatar, and “About you” appear in People. People can find
            you by display name or username. Your email is not shown.
          </li>
          <li>
            Lists set to Visible · People with access require membership or an
            active guest link. Guest links allow viewing without an account
            until they expire or are revoked.
          </li>
          <li>
            Hidden lists and hidden, fulfilled, or reserved wishes do not appear
            in Browse. Only the person who reserved a wish and list admins can
            view that reserved wish. The person’s identity stays private.
          </li>
        </ul>
        <h2>What the app stores</h2>
        <p>
          Account information, a password hash, session and recovery records,
          lists, wishes, uploaded images, memberships, invitations,
          reservations, and Premium records support the features you use.
          Account emails are delivered through the configured email service. The
          app does not store payment-card details; checkout is handled by Paddle
          when enabled.
        </p>
        <h2>Cookies and preferences</h2>
        <p>
          Cookies keep you signed in and remember access granted by a guest
          link. Your theme preference is stored in your browser. The app has no
          advertising or analytics tracking configured.
        </p>
        <h2>Your controls</h2>
        <p>
          Edit your profile or delete your account in Account. Use each list’s
          settings to hide it or manage guest links, and its edit pages to
          remove images. Hiding a list ends its active reservations.
        </p>
        <p>
          Account deletion removes sign-in access and your profile. Shared lists
          may transfer to another admin or be archived; wishes you added can
          remain without your name. Payment records needed to resolve payments
          can remain without a linked profile.
        </p>
        <p>
          The final hosting providers, retention periods, and production privacy
          notice will be confirmed before public launch.
        </p>
      </>
    ),
  },
  terms: {
    title: "Preview terms",
    content: (
      <>
        <p>
          Wishlist is a development preview by {creator}. These notes describe
          how to use this preview; production service and purchase terms will be
          reviewed before public launch. Contact {contact} with questions.
        </p>
        <h2>Use it thoughtfully</h2>
        <ul>
          <li>
            Only upload content you are allowed to share. Do not share sensitive
            personal information about yourself or others.
          </li>
          <li>
            Keep your password and private sharing links secure. Do not try to
            bypass access controls or interfere with other users.
          </li>
          <li>
            Check who can see your list before choosing Show list. Lists set to
            Anyone can be viewed without an account and found in Browse.
          </li>
        </ul>
        <h2>Wishes and reservations</h2>
        <p>
          A reservation helps people coordinate a gift. It does not buy an item,
          guarantee availability, or create a transaction between users. Product
          links lead to external websites whose prices and terms may change.
        </p>
        <h2>Premium and the preview</h2>
        <p>
          Current payment testing uses Paddle sandbox; sandbox transactions do
          not charge money. Real payments are not enabled for this preview.
          Features and availability may change during development, so keep your
          own copy of information you need.
        </p>
        <h2>Deleting your account</h2>
        <p>
          You can delete your account in settings. Review the deletion summary
          to see what happens to shared lists and reservations before
          confirming.
        </p>
      </>
    ),
  },
  "site-map": {
    title: "Site map",
    content: (
      <>
        <h2>Explore</h2>
        <ul>
          <li>
            <Link href="/">Welcome</Link>
          </li>
          <li>
            <Link href="/browse">Public wishlists</Link>
          </li>
          <li>
            <Link href="/browse?view=wishes">Available wishes</Link>
          </li>
          <li>
            <Link href="/browse?view=users">People</Link>
          </li>
        </ul>
        <h2>Your space</h2>
        <ul>
          <li>
            <Link href="/lists">Your wishlists</Link>
          </li>
          <li>
            <Link href="/lists/shared">Lists shared with you</Link>
          </li>
          <li>
            <Link href="/reservations">Your reservations</Link>
          </li>
          <li>
            <Link href="/account/profile">Profile and settings</Link>
          </li>
          <li>
            <Link href="/sign-in">Sign in</Link>
          </li>
          <li>
            <Link href="/sign-up">Create an account</Link>
          </li>
        </ul>
        <h2>Information</h2>
        <ul>
          <li>
            <Link href="/about">About and contact</Link>
          </li>
          <li>
            <Link href="/accessibility">Accessibility</Link>
          </li>
          <li>
            <Link href="/privacy">Privacy</Link>
          </li>
          <li>
            <Link href="/terms">Preview terms</Link>
          </li>
        </ul>
      </>
    ),
  },
};

const readInformation = (name: string) => {
  if (!Object.hasOwn(information, name)) notFound();
  return information[name];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ information: string }>;
}): Promise<Metadata> {
  const page = readInformation((await params).information);
  return { title: page.title, robots: { index: false, follow: false } };
}

export default async function InformationPage({
  params,
}: {
  params: Promise<{ information: string }>;
}) {
  const page = readInformation((await params).information);
  return (
    <article className={styles["information-page"]}>
      <h1>{page.title}</h1>
      {page.content}
    </article>
  );
}
