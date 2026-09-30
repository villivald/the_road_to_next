import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/form/action-form";
import styles from "@/components/shell.module.css";
import { getAuth } from "@/features/auth/actions/get-auth";
import { WishCollection } from "@/features/wish/components/wish-collection";
import { changePublication } from "@/features/wishlist/actions/manage-list";
import { readWishlist } from "@/features/wishlist/service/lists";
import { listPath, listsPath } from "@/paths";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false, follow: false },
};

export default async function ListPage({
  params,
  searchParams,
}: {
  params: Promise<{ listId: string }>;
  searchParams: Promise<{
    created?: string;
    saved?: string;
    wishDeleted?: string;
    sort?: string;
    view?: string;
    page?: string;
  }>;
}) {
  const { user } = await getAuth();
  const { listId } = await params;
  const list = await readWishlist(listId, user?.id ?? null);

  if (!list) {
    notFound();
  }

  const query = await searchParams;
  const { created, saved, wishDeleted } = query;
  const published = list.publication === "PUBLISHED";

  return (
    <section className={styles.page}>
      {list.canManage && <Link href={listsPath}>Back to my lists</Link>}

      {list.canManage && (created === "1" || saved === "1") && (
        <p role="status" className={styles.notice}>
          {created === "1" ? "List created as a draft." : "Changes saved."}
        </p>
      )}

      <div className={styles["page-heading"]}>
        <div>
          <p className={styles.muted}>
            {published ? "Published" : "Draft"} ·{" "}
            {list.visibility === "PUBLIC" ? "Public" : "Private"}
          </p>
          <h1>{list.title}</h1>
        </div>
        {list.canManage && (
          <Link className={styles.button} href={`${listPath(list.id)}/edit`}>
            Edit list
          </Link>
        )}
      </div>

      <p className={styles.description}>
        {list.description || "No description yet."}
      </p>

      {list.canManage && wishDeleted === "1" && (
        <p role="status" className={styles.notice}>
          Wish deleted.
        </p>
      )}

      <WishCollection
        listId={list.id}
        userId={user?.id ?? null}
        canManage={list.canManage}
        searchParams={query}
      />

      {list.canManage && (
        <section
          className={styles["list-settings"]}
          aria-labelledby="list-settings-heading"
        >
          <h2 id="list-settings-heading">List settings</h2>
          <p className={styles.muted}>
            {published
              ? list.visibility === "PUBLIC"
                ? "Anyone with the link can view this list."
                : "Only people with access can view this list."
              : "Only this list’s admins can see this draft."}
          </p>
          <p>
            Reservations: {list.reservationsEnabled ? "enabled" : "disabled"}
            {!published && list.reservationsEnabled ? " when published" : ""}.
          </p>

          <ActionForm
            action={changePublication.bind(null, list.id)}
            label={published ? "Move to drafts" : "Publish list"}
            pendingLabel="Updating…"
          >
            <input
              type="hidden"
              name="publication"
              value={published ? "DRAFT" : "PUBLISHED"}
            />
            {published && (
              <p className={styles.muted}>
                Moving to drafts removes viewer access and ends active
                reservations.
              </p>
            )}
          </ActionForm>

          <Link href={`${listPath(list.id)}/delete`}>Delete list</Link>
        </section>
      )}
    </section>
  );
}
