import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { deleteList } from "@/features/wishlist/actions/manage-list";
import { ListActionForm } from "@/features/wishlist/components/list-action-form";
import { readManagedWishlist } from "@/features/wishlist/service/lists";
import { listPath } from "@/paths";

export const metadata: Metadata = {
  title: "Delete list",
  robots: { index: false, follow: false },
};

export default async function DeleteListPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { user } = await getAuthOrRedirect();
  const { listId } = await params;
  const list = await readManagedWishlist(listId, user.id);

  if (!list) {
    notFound();
  }

  return (
    <section className={styles.editor}>
      <h1>Delete list?</h1>
      <p className={styles.description}>
        “{list.title}” and all its wishes and reservations will be permanently
        deleted. This cannot be undone.
      </p>
      <ListActionForm
        action={deleteList.bind(null, list.id)}
        label="Delete permanently"
        pendingLabel="Deleting…"
        destructive
      >
        <label className={styles["checkbox-label"]}>
          <input type="checkbox" name="confirm" value="delete" required />I
          understand this cannot be undone
        </label>
      </ListActionForm>
      <Link href={listPath(list.id)}>Cancel and keep list</Link>
    </section>
  );
}
