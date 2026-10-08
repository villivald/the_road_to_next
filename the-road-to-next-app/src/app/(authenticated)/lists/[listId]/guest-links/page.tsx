import { ArrowLeft, Clock, Eye, Info, Link2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/form/action-form";
import { LocalTime } from "@/components/local-time";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { revokeLink } from "@/features/guest/actions/manage-links";
import { GuestLinkForm } from "@/features/guest/components/guest-link-form";
import { readGuestLinks } from "@/features/guest/service/links";
import { readPremiumAccess } from "@/features/premium/service/entitlements";
import sharingStyles from "@/features/sharing/components/sharing.module.css";
import {
  accountPlanPath,
  guestLinksPath,
  listPath,
  sharingPath,
} from "@/paths";

export const metadata: Metadata = {
  title: "Guest links",
  robots: { index: false, follow: false },
};

export default async function GuestLinksPage({
  params,
  searchParams,
}: {
  params: Promise<{ listId: string }>;
  searchParams: Promise<{ page?: string; revoked?: string }>;
}) {
  const { user } = await getAuthOrRedirect();
  const { listId } = await params;
  const query = await searchParams;
  const list = await readGuestLinks(listId, user.id, query.page);
  if (!list) notFound();
  const access = await readPremiumAccess(list.ownerId!);
  const visible = list.publication === "PUBLISHED";

  return (
    <div className={sharingStyles.page}>
      <header className={sharingStyles.header}>
        <Link href={sharingPath(listId)}>
          <ArrowLeft size={18} aria-hidden="true" /> Back to sharing and members
        </Link>
        <h1>Guest links</h1>
        <p className={styles.description}>{list.title}</p>
        <p className={styles.muted}>
          Let someone view your wishes without creating an account.
        </p>
      </header>
      {!visible && (
        <p className={styles.notice}>
          This list is hidden, so guest links cannot open it yet.{" "}
          <Link href={`${listPath(listId)}#list-settings-heading`}>
            Go to list settings and choose Show list
          </Link>
          .
        </p>
      )}
      {query.revoked === "1" && (
        <p role="status" className={styles.notice}>
          Guest link disabled. It no longer opens this list or its images.
        </p>
      )}

      <section
        className={sharingStyles.panel}
        aria-labelledby="create-guest-link-heading"
      >
        <div className={sharingStyles.heading}>
          <h2 id="create-guest-link-heading">
            <Link2 size={21} aria-hidden="true" /> Create a guest link
          </h2>
          <p className={styles.muted}>
            Choose a name to recognize it later and how long it should work.
          </p>
        </div>
        <p className={sharingStyles.hint}>
          <Eye size={18} aria-hidden="true" /> View only: guests cannot reserve
          gifts, edit wishes, or join the list.
        </p>
        {access.plan === "PREMIUM" ? (
          <GuestLinkForm
            key={list.guestLinks
              .filter((link) => link.revokedAt)
              .map((link) => link.id)
              .join(",")}
            listId={listId}
          />
        ) : (
          <p className={styles.notice}>
            The owner needs Premium to create links. Existing links keep their
            expiry dates and can still be disabled.{" "}
            {list.ownerId === user.id && (
              <Link href={accountPlanPath}>View your plan</Link>
            )}
          </p>
        )}
      </section>

      <section
        className={sharingStyles.panel}
        aria-labelledby="guest-links-heading"
      >
        <div className={sharingStyles.heading}>
          <h2 id="guest-links-heading">
            <Clock size={21} aria-hidden="true" /> Your links
          </h2>
          <p className={styles.muted}>
            Link addresses are shown only when created. You can share a saved
            link again while it is active. If you no longer have the address,
            create a new link.
          </p>
        </div>
        {list.guestLinks.length ? (
          <ul className={sharingStyles.resources}>
            {list.guestLinks.map((link) => {
              const expired = link.expiresAt <= new Date();
              const active = !link.revokedAt && !expired;
              return (
                <li className={sharingStyles.row} key={link.id}>
                  <div className={sharingStyles.identity}>
                    <span className={sharingStyles.avatar} aria-hidden="true">
                      <Link2 size={20} />
                    </span>
                    <div>
                      <h3>{link.label}</h3>
                      <p className={styles.muted}>
                        {link.revokedAt
                          ? "Disabled"
                          : expired
                            ? "Expired"
                            : visible
                              ? "Active"
                              : "Waiting for list to be visible"}
                      </p>
                      <p className={styles.muted}>
                        {expired ? "Expired" : "Expires"}{" "}
                        <LocalTime value={link.expiresAt.toISOString()} />
                      </p>
                    </div>
                  </div>
                  {active && (
                    <ActionForm
                      action={revokeLink.bind(null, listId, link.id)}
                      label="Disable link"
                      secondary
                      pendingLabel="Disabling…"
                    >
                      {null}
                    </ActionForm>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.muted}>
            {list.page > 1
              ? "No links on this page."
              : access.plan === "PREMIUM"
                ? "No guest links yet. Create one above and copy it to share."
                : "No guest links yet."}
          </p>
        )}
        {(list.page > 1 || list.hasNextPage) && (
          <nav className={styles.actions} aria-label="Guest link pages">
            {list.page > 1 && (
              <Link href={`${guestLinksPath(listId)}?page=${list.page - 1}`}>
                Previous page
              </Link>
            )}
            <span>Page {list.page}</span>
            {list.hasNextPage && (
              <Link href={`${guestLinksPath(listId)}?page=${list.page + 1}`}>
                Next page
              </Link>
            )}
          </nav>
        )}
      </section>
      <details className={styles.disclosure}>
        <summary>What guests can see and how to end access</summary>
        <p>
          Guests see only available wishes. Hidden, fulfilled, and reserved
          wishes stay hidden, even if an admin opens the guest link.
        </p>
        <p>
          Anyone with a link can use or forward it. Disable link stops that link
          for everyone. Removing a member does not disable links they already
          have.
        </p>
        <p className={sharingStyles.hint}>
          <Info size={18} aria-hidden="true" /> Hiding the list stops all guest
          access. Showing it again restores links that are still active; expiry
          dates do not change.
        </p>
      </details>
    </div>
  );
}
