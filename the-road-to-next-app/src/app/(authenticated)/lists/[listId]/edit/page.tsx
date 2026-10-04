import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { ImageEditor } from "@/features/media/components/image-editor";
import { ListForm } from "@/features/wishlist/components/list-form";
import { readManagedWishlist } from "@/features/wishlist/service/lists";
import { sharingPath } from "@/paths";

export const metadata: Metadata = {
  title: "Edit list",
  robots: { index: false, follow: false },
};

export default async function EditListPage({
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
      <h1>Edit list</h1>
      <p className={styles.muted}>
        Update the details and reservation settings for your list.
      </p>
      <ListForm list={list} />
      <Link href={sharingPath(listId)}>
        Change visibility and manage members
      </Link>
      <ImageEditor target={{ kind: "list", listId }} image={list.image} />
    </section>
  );
}
