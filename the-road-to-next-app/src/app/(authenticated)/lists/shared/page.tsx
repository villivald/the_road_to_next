import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/form/action-form";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { deleteMembership } from "@/features/sharing/actions/manage-sharing";
import { readSharedLists } from "@/features/sharing/service/queries";
import { listPath, listsPath, sharedListsPath, sharingPath } from "@/paths";

export const metadata: Metadata = {
  title: "Lists shared with you",
  robots: { index: false, follow: false },
};

export default async function SharedListsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    joined?: string;
    left?: string;
    roleChanged?: string;
  }>;
}) {
  const { user } = await getAuthOrRedirect();
  const query = await searchParams;
  const { lists, page, hasNextPage } = await readSharedLists(
    user.id,
    query.page,
  );
  return (
    <section className={styles.page}>
      <Link href={listsPath}>Back to my lists</Link>
      <div className={styles["page-heading"]}>
        <div>
          <h1>Lists shared with you</h1>
          <p className={styles.muted}>
            Lists owned by other people that you have joined.
          </p>
        </div>
      </div>
      {query.roleChanged === "1" && (
        <p role="status" className={styles.notice}>
          You are now a member. Admin controls are no longer available.
        </p>
      )}
      {query.joined === "1" && (
        <p role="status" className={styles.notice}>
          Invitation accepted. You have joined the list.
        </p>
      )}
      {query.left === "1" && (
        <p role="status" className={styles.notice}>
          You have left the list.
        </p>
      )}
      {lists.length ? (
        <ul className={styles["list-grid"]}>
          {lists.map((list) => (
            <li key={list.id} className={styles["list-card"]}>
              <h2>
                {list.title ? (
                  <Link href={listPath(list.listId)}>{list.title}</Link>
                ) : (
                  "Hidden list"
                )}
              </h2>
              <p>
                {list.role === "ADMIN" ? "Admin" : "Member"}
                {!list.title ? " · Available when the admins show it" : ""}
              </p>
              {list.role === "ADMIN" && (
                <Link href={sharingPath(list.listId)}>Sharing and members</Link>
              )}
              <ActionForm
                action={deleteMembership.bind(null, list.listId, list.id)}
                label="Leave list"
                pendingLabel="Leaving…"
                destructive
              >
                <label className={styles["checkbox-label"]}>
                  <input type="checkbox" name="confirm" value="yes" required />
                  Remove my membership. I will lose private access and any
                  reservations that require it.
                </label>
              </ActionForm>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          No shared lists on this page. Accept an email invitation to join a
          list.
        </p>
      )}
      {(page > 1 || hasNextPage) && (
        <nav className={styles.actions} aria-label="Shared list pages">
          {page > 1 && (
            <Link href={`${sharedListsPath}?page=${page - 1}`}>
              Previous page
            </Link>
          )}
          <span>Page {page}</span>
          {hasNextPage && (
            <Link href={`${sharedListsPath}?page=${page + 1}`}>Next page</Link>
          )}
        </nav>
      )}
    </section>
  );
}
