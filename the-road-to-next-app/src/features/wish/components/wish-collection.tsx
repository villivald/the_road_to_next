import { Sparkles } from "lucide-react";
import { CardActions } from "@/components/cards/card-actions";
import { CardMedia } from "@/components/cards/card-media";
import { WishStatus } from "@/components/cards/wish-status";
import styles from "@/components/shell.module.css";
import { localizedPath } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import { listPath, newWishPath, wishPath } from "@/paths";
import { readListWishes } from "../service/wishes";
import { formatWishPrice } from "../utils/money";
import { WishPriority } from "./wish-priority";

export async function WishCollection({
  listId,
  userId,
  canManage,
  searchParams,
}: {
  listId: string;
  userId: string | null;
  canManage: boolean;
  searchParams: { sort?: string; view?: string; page?: string };
}) {
  const t = await getText();

  const { wishes, sort, view, page, hasNextPage } = await readListWishes(
    listId,
    userId,
    {
      sort: searchParams.sort,
      view: canManage ? searchParams.view : "current",
      page: Number(searchParams.page ?? 1),
    },
  );

  const pageUrl = (nextPage: number) =>
    `${listPath(listId)}?${new URLSearchParams({ sort, view, page: String(nextPage) })}`;

  return (
    <section className={styles.page} aria-labelledby="wishes-heading">
      <div className={styles["page-heading"]}>
        <h2 id="wishes-heading">
          {view === "fulfilled" ? t("Fulfilled wishes") : t("Wishes")}
        </h2>
        {canManage && (
          <Link href={newWishPath(listId)} className={styles.button}>
            {t("Add a wish")}
          </Link>
        )}
      </div>

      <form
        action={localizedPath(listPath(listId), t.locale)}
        className={styles["wish-toolbar"]}
      >
        <div className={styles.field}>
          <label htmlFor="wish-sort">{t("Sort wishes")}</label>
          <select id="wish-sort" name="sort" defaultValue={sort}>
            <option value="newest">{t("Newest first")}</option>
            <option value="oldest">{t("Oldest first")}</option>
            <option value="priority">{t("Highest priority")}</option>
            <option value="title">{t("Title A–Z")}</option>
          </select>
        </div>
        {canManage && (
          <div className={styles.field}>
            <label htmlFor="wish-view">{t("Show")}</label>
            <select id="wish-view" name="view" defaultValue={view}>
              <option value="current">{t("Current wishes")}</option>
              <option value="fulfilled">{t("Fulfilled history")}</option>
            </select>
          </div>
        )}
        <button className={styles["secondary-button"]} type="submit">
          {t("Apply")}
        </button>
      </form>

      {wishes.length ? (
        <ul className={styles["list-grid"]}>
          {wishes.map((wish) => (
            <li key={wish.id} className={styles["list-card"]}>
              <CardMedia image={wish.image} />
              <h3 className={styles["wish-title"]}>
                <Link href={wishPath(listId, wish.id)}>{wish.title}</Link>
              </h3>
              <p className={styles.price}>
                {formatWishPrice(wish.priceMinor, wish.currency, t.locale)}
              </p>
              <WishPriority priority={wish.priority} />
              {canManage && (
                <WishStatus
                  hidden={wish.hidden}
                  fulfilled={!!wish.fulfilledAt}
                  reserved={wish.isReserved}
                  showVisible
                />
              )}
              <CardActions
                path={wishPath(listId, wish.id)}
                title={wish.title}
                canManage={canManage}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles["empty-state"]}>
          <Sparkles aria-hidden="true" />
          <h3>
            {page > 1
              ? t("No more wishes")
              : view === "fulfilled"
                ? t("No fulfilled wishes yet")
                : canManage
                  ? t("No wishes yet")
                  : t("No wishes available")}
          </h3>
          <p className={styles.muted}>
            {page > 1
              ? t("Return to an earlier page.")
              : view === "fulfilled"
                ? t("Wishes you mark as fulfilled will appear here.")
                : canManage
                  ? t("Start with just a title. You can add details later.")
                  : t("Check back for new wishes.")}
          </p>
        </div>
      )}

      {(page > 1 || hasNextPage) && (
        <nav aria-label={t("Wish pages")} className={styles.actions}>
          {page > 1 && (
            <Link href={pageUrl(page - 1)}>{t("Previous page")}</Link>
          )}
          <span>
            {t("Page")} {page}
          </span>
          {hasNextPage && (
            <Link href={pageUrl(page + 1)}>{t("Next page")}</Link>
          )}
        </nav>
      )}
    </section>
  );
}
