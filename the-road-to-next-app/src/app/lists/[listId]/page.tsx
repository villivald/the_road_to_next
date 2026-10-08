import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/cards/copy-link";
import { ListStatus } from "@/components/cards/list-status";
import styles from "@/components/shell.module.css";
import { getAuth } from "@/features/auth/actions/get-auth";
import { MediaImage } from "@/features/media/components/media-image";
import { WishCollection } from "@/features/wish/components/wish-collection";
import { ListSettings } from "@/features/wishlist/components/list-settings";
import { readWishlist } from "@/features/wishlist/service/lists";
import { browsePath, listPath, listsPath } from "@/paths";

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
      <Link href={list.canManage ? listsPath : browsePath}>
        {list.canManage ? "Back to my lists" : "Back to browse"}
      </Link>

      {list.canManage && (created === "1" || saved === "1") && (
        <p role="status" className={styles.notice}>
          {created === "1"
            ? "List created. It’s hidden from viewers until you show it."
            : "Changes saved."}
        </p>
      )}

      <div className={styles["page-heading"]}>
        <div>
          <ListStatus
            publication={list.publication}
            visibility={list.visibility}
          />
          <h1>{list.title}</h1>
        </div>
        <div className={styles.actions}>
          {published && list.visibility === "PUBLIC" && (
            <CopyLink path={listPath(list.id)} title={list.title} />
          )}
          {list.canManage && (
            <Link className={styles.button} href={`${listPath(list.id)}/edit`}>
              <Pencil size={18} aria-hidden="true" /> Edit list
            </Link>
          )}
        </div>
      </div>

      <MediaImage image={list.image} />

      {list.description && (
        <p className={styles.description}>{list.description}</p>
      )}

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

      {list.canManage && <ListSettings list={list} />}
    </section>
  );
}
