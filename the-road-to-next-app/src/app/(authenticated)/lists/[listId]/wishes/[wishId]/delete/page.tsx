import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/form/action-form";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { removeWish } from "@/features/wish/actions/manage-wish";
import { readWish } from "@/features/wish/service/wishes";
import { wishPath } from "@/paths";

export const metadata: Metadata = {
  title: "Delete wish",
  robots: { index: false, follow: false },
};

export default async function DeleteWishPage({
  params,
}: {
  params: Promise<{ listId: string; wishId: string }>;
}) {
  const { user } = await getAuthOrRedirect();
  const { listId, wishId } = await params;
  const wish = await readWish(listId, wishId, user.id, true);

  if (!wish) {
    notFound();
  }

  return (
    <section className={styles.editor}>
      <h1>Delete wish?</h1>
      <p className={styles.description}>
        “{wish.title}” and its reservations will be permanently deleted. This
        cannot be undone.
      </p>
      <ActionForm
        action={removeWish.bind(null, listId, wishId)}
        label="Delete permanently"
        pendingLabel="Deleting…"
        destructive
      >
        <label className={styles["checkbox-label"]}>
          <input type="checkbox" name="confirm" value="delete" required />I
          understand this cannot be undone
        </label>
      </ActionForm>
      <Link href={wishPath(listId, wishId)}>Cancel and keep wish</Link>
    </section>
  );
}
