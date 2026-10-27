import { List } from "lucide-react";
import type { Metadata } from "next";
import { CardActions } from "@/components/cards/card-actions";
import { CardMediaLink, ListPreview } from "@/components/cards/card-media";
import cardStyles from "@/components/cards/cards.module.css";
import { ListStatus } from "@/components/cards/list-status";
import { ListWishCounts } from "@/components/cards/list-wish-counts";
import { ReservationAvailability } from "@/components/cards/reservation-availability";
import { SuccessMessage } from "@/components/form/success-message";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { readFavoriteIds } from "@/features/favorites/service/favorites";
import { ListTheme } from "@/features/premium/components/list-theme";
import { MyListsControls } from "@/features/wishlist/components/my-lists-controls";
import { getMyLists } from "@/features/wishlist/queries/get-my-lists";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import { listSettingsPath, sharingPath } from "@/paths";
import { listPath, listsPath } from "@/paths";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getText();
  return {
    title: t("My lists"),
    robots: { index: false, follow: false },
  };
}

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; deleted?: string }>;
}) {
  const t = await getText();

  const params = await searchParams;
  const { lists, page, hasNextPage } = await getMyLists(
    Number(params.page ?? 1),
  );
  const { user } = await getAuthOrRedirect();
  const favoriteIds = await readFavoriteIds(
    user.id,
    "list",
    lists.map(({ id }) => id),
  );

  return (
    <section className={styles.page}>
      <MyListsControls />

      {params.deleted === "1" && (
        <SuccessMessage queryKeys={["deleted"]}>
          {t("List deleted.")}
        </SuccessMessage>
      )}

      {lists.length ? (
        <ul className={styles["list-grid"]}>
          {lists.map((list) => (
            <li key={list.id} className={styles["list-card"]}>
              <ListTheme theme={list.theme} media>
                <CardMediaLink path={listPath(list.id)} title={list.title}>
                  <ListPreview
                    image={list.image}
                    images={list.previewImages}
                    title={list.title}
                  />
                </CardMediaLink>
              </ListTheme>
              <h2>
                <Link href={listPath(list.id)}>{list.title}</Link>
              </h2>
              <ListStatus
                publication={list.publication}
                visibility={list.visibility}
              />
              <div className={cardStyles["list-footer"]}>
                <ListWishCounts
                  availableWishCount={list.availableWishCount}
                  reservedWishCount={list.reservedWishCount}
                />
                <ReservationAvailability enabled={list.reservationsEnabled} />
                <CardActions
                  path={listPath(list.id)}
                  settingsPath={listSettingsPath(list.id)}
                  title={list.title}
                  canManage
                  favorite={{
                    kind: "list",
                    targetId: list.id,
                    saved: favoriteIds.includes(list.id),
                  }}
                  sharingPath={sharingPath(list.id)}
                  canCopy={
                    list.publication === "PUBLISHED" &&
                    list.visibility === "PUBLIC"
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles["empty-state"]}>
          <List aria-hidden="true" />
          <h2>{page === 1 ? t("No lists yet") : t("No more lists")}</h2>
          <p className={styles.muted}>
            {page === 1
              ? t("Create your first list and make it your own.")
              : t("Return to an earlier page to find your lists.")}
          </p>
        </div>
      )}

      {(page > 1 || hasNextPage) && (
        <nav className={styles.actions} aria-label={t("List pages")}>
          {page > 1 && (
            <Link href={`${listsPath}?page=${page - 1}`}>
              {t("Previous page")}
            </Link>
          )}
          <span>
            {t("Page")} {page}
          </span>
          {hasNextPage && (
            <Link href={`${listsPath}?page=${page + 1}`}>{t("Next page")}</Link>
          )}
        </nav>
      )}
    </section>
  );
}
