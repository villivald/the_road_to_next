import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/form/action-form";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { revokeLink } from "@/features/guest/actions/manage-links";
import { GuestLinkForm } from "@/features/guest/components/guest-link-form";
import { readGuestLinks } from "@/features/guest/service/links";
import { readPremiumAccess } from "@/features/premium/service/entitlements";
import { guestLinksPath, sharingPath } from "@/paths";

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
  return (
    <section className={styles.editor}>
      <Link href={sharingPath(listId)}>Back to sharing and members</Link>
      <h1>Guest links</h1>
      <p className={styles.description}>{list.title}</p>
      <p>
        Share a read-only view without requiring an account. Guests cannot edit,
        join, or reserve. Hidden, fulfilled, and reserved wishes stay hidden,
        even for signed-in admins viewing through a guest link.
      </p>
      <p>
        Links work only while the list is published. Anyone holding a link may
        use or forward it. Removing a member does not revoke guest links; revoke
        a link here to end its access.
      </p>
      {list.publication === "DRAFT" && (
        <p className={styles.notice}>
          This list is a draft. Guest links will work after you publish it.
        </p>
      )}
      {query.revoked === "1" && (
        <p role="status" className={styles.notice}>
          Guest link revoked. It no longer grants access to content or images.
        </p>
      )}
      <h2>Create a link</h2>
      {access.plan === "PREMIUM" ? (
        <GuestLinkForm
          key={list.guestLinks
            .filter((link) => link.revokedAt)
            .map((link) => link.id)
            .join(",")}
          listId={listId}
        />
      ) : (
        <p>
          The list owner needs Premium to create new links. Existing links keep
          their expiry and can still be revoked.
        </p>
      )}
      <h2>Issued links</h2>
      <p className={styles.muted}>
        Links are shown only when created. To share again or extend access,
        create a new link; old links keep their original expiry.
      </p>
      {list.guestLinks.length ? (
        <ul className={styles["list-grid"]}>
          {list.guestLinks.map((link) => (
            <li className={styles["list-card"]} key={link.id}>
              <h3>{link.label}</h3>
              <p>
                {link.revokedAt
                  ? "Revoked"
                  : link.expiresAt <= new Date()
                    ? "Expired"
                    : "Active"}
              </p>
              <p>
                Expires{" "}
                <time dateTime={link.expiresAt.toISOString()}>
                  {link.expiresAt.toLocaleString("en-GB", { timeZone: "UTC" })}{" "}
                  UTC
                </time>
              </p>
              {!link.revokedAt && (
                <ActionForm
                  action={revokeLink.bind(null, listId, link.id)}
                  label="Revoke guest link"
                  pendingLabel="Revoking…"
                >
                  <p className={styles.muted}>
                    Everyone using this link will lose its guest access.
                  </p>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No guest links on this page.</p>
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
  );
}
