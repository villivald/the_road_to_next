import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { WishForm } from "@/features/wish/components/wish-form";
import { readManagedWishlist } from "@/features/wishlist/service/lists";

export const metadata: Metadata = {
  title: "Add a wish",
  robots: { index: false, follow: false },
};

export default async function NewWishPage({
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
      <h1>Add a wish</h1>
      <p className={styles.description}>
        For “{list.title}”. Start with a title and add any details you like.
      </p>
      <WishForm listId={list.id} />
    </section>
  );
}
