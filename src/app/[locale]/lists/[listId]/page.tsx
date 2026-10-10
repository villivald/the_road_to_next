import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/cards/copy-link";
import { ListStatus } from "@/components/cards/list-status";
import styles from "@/components/shell.module.css";
import { getAuth } from "@/features/auth/actions/get-auth";
import { MediaImage } from "@/features/media/components/media-image";
import { WishCollection } from "@/features/wish/components/wish-collection";
import { readWishlist } from "@/features/wishlist/service/lists";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import { browsePath, listPath, listSettingsPath, listsPath } from "@/paths";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Wishlist",
    robots: { index: false, follow: false },
  };
}

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
  const t = await getText();

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
        {list.canManage ? t("Back to my lists") : t("Back to browse")}
      </Link>

      {list.canManage && (created === "1" || saved === "1") && (
        <p role="status" className={styles.notice}>
          {created === "1"
            ? t("List created. It’s hidden from viewers until you show it.")
            : t("Changes saved.")}
          {created === "1" && (
            <>
              {" "}
              <Link href={listSettingsPath(list.id)}>
                {t("Go to list settings")}
              </Link>
            </>
          )}
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
            <Link className={styles.button} href={listSettingsPath(list.id)}>
              <Settings size={18} aria-hidden="true" /> {t("List settings")}
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
          {t("Wish deleted.")}
        </p>
      )}

      <WishCollection
        listId={list.id}
        userId={user?.id ?? null}
        canManage={list.canManage}
        searchParams={query}
      />
    </section>
  );
}
