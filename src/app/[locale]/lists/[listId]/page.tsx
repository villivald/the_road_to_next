import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailNavigation } from "@/app/_navigation/navigation-context";
import { detailSection } from "@/app/_navigation/navigation-path";
import { CopyLink } from "@/components/cards/copy-link";
import { ListStatus } from "@/components/cards/list-status";
import { SuccessMessage } from "@/components/form/success-message";
import styles from "@/components/shell.module.css";
import { getAuth } from "@/features/auth/actions/get-auth";
import { FavoriteButton } from "@/features/favorites/components/favorite-button";
import { readFavoriteIds } from "@/features/favorites/service/favorites";
import { MediaImage } from "@/features/media/components/media-image";
import { ListTheme } from "@/features/premium/components/list-theme";
import premiumStyles from "@/features/premium/components/personalization.module.css";
import { SharingCardDownload } from "@/features/premium/components/sharing-card-download";
import { readSharingCard } from "@/features/premium/service/sharing-card";
import { WishCollection } from "@/features/wish/components/wish-collection";
import { readWishlist } from "@/features/wishlist/service/lists";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import {
  browsePath,
  favoritesPath,
  listPath,
  listSettingsPath,
  listsPath,
  reservationsPath,
} from "@/paths";

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
    from?: string;
    created?: string;
    saved?: string;
    wishDeleted?: string;
    sort?: string;
    view?: string;
    page?: string;
  }>;
}) {
  const t = await getText();

  const { user, session } = await getAuth();
  const { listId } = await params;
  const list = await readWishlist(listId, user?.id ?? null);

  if (!list) {
    notFound();
  }

  const query = await searchParams;
  const { created, saved, wishDeleted } = query;
  const section = detailSection(query.from, list.canManage);
  const published = list.publication === "PUBLISHED";
  const [favoriteIds, sharingCard] = await Promise.all([
    readFavoriteIds(user?.emailVerified ? user.id : null, "list", [list.id]),
    list.canManage && user && session
      ? readSharingCard(user.id, session.id, list.id)
      : null,
  ]);
  const premium = sharingCard !== null;

  return (
    <section className={styles.page}>
      <DetailNavigation section={section} />
      <Link
        href={
          section === "favorites"
            ? favoritesPath
            : section === "lists"
              ? listsPath
              : section === "reservations"
                ? reservationsPath
                : browsePath
        }
      >
        {section === "favorites"
          ? t("Back to favorites")
          : section === "lists"
            ? t("Back to my lists")
            : section === "reservations"
              ? t("View my reservations")
              : t("Back to browse")}
      </Link>

      {list.canManage && (created === "1" || saved === "1") && (
        <SuccessMessage>
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
        </SuccessMessage>
      )}

      <ListTheme theme={list.theme}>
        <div
          className={`${styles["page-heading"]} ${list.theme !== "classic" ? premiumStyles["themed-heading"] : ""}`}
        >
          <div className={styles["list-identity"]}>
            <MediaImage image={list.image} cover sizes="144px" />
            <div>
              <ListStatus
                publication={list.publication}
                visibility={list.visibility}
              />
              <h1>{list.title}</h1>
            </div>
          </div>
          <div className={styles.actions}>
            {user?.emailVerified && (
              <FavoriteButton
                kind="list"
                targetId={list.id}
                saved={favoriteIds.includes(list.id)}
                title={list.title}
              />
            )}
            {published && list.visibility === "PUBLIC" && (
              <CopyLink path={listPath(list.id)} title={list.title} />
            )}
            {list.canManage && (
              <SharingCardDownload
                modal
                listId={list.id}
                title={list.title}
                theme={list.theme}
                published={published}
                privateList={list.visibility === "PRIVATE"}
                premium={premium}
              />
            )}
            {list.canManage && (
              <Link className={styles.button} href={listSettingsPath(list.id)}>
                <Settings size={18} aria-hidden="true" /> {t("List settings")}
              </Link>
            )}
          </div>
        </div>
      </ListTheme>

      {list.description && (
        <p className={styles.description}>{list.description}</p>
      )}

      {list.canManage && wishDeleted === "1" && (
        <SuccessMessage>{t("Wish deleted.")}</SuccessMessage>
      )}

      <WishCollection
        listId={list.id}
        userId={user?.emailVerified ? user.id : null}
        canManage={list.canManage}
        section={section}
        reservationsEnabled={published && list.reservationsEnabled}
        searchParams={query}
      />
    </section>
  );
}
