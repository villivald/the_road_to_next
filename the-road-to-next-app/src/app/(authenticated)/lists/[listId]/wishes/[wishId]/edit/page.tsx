import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { ImageEditor } from "@/features/media/components/image-editor";
import { WishForm } from "@/features/wish/components/wish-form";
import { readWish } from "@/features/wish/service/wishes";

export const metadata: Metadata = {
  title: "Edit wish",
  robots: { index: false, follow: false },
};

export default async function EditWishPage({
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
      <h1>Edit wish</h1>
      <p className={styles.description}>
        In “{wish.wishlist.title}”. Only the title is required.
      </p>
      <WishForm listId={listId} wish={wish} />
      <ImageEditor
        target={{ kind: "wish", listId, wishId }}
        image={wish.image}
        fallbackAlt={wish.title}
      />
    </section>
  );
}
