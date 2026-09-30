import Link from "next/link";
import styles from "@/components/shell.module.css";
import { MediaImage } from "@/features/media/components/media-image";
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
          {view === "fulfilled" ? "Fulfilled wishes" : "Wishes"}
        </h2>
        {canManage && (
          <Link href={newWishPath(listId)} className={styles.button}>
            Add a wish
          </Link>
        )}
      </div>

      <form action={listPath(listId)} className={styles["wish-toolbar"]}>
        <div className={styles.field}>
          <label htmlFor="wish-sort">Sort wishes</label>
          <select id="wish-sort" name="sort" defaultValue={sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">Highest priority</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
        {canManage && (
          <div className={styles.field}>
            <label htmlFor="wish-view">Show</label>
            <select id="wish-view" name="view" defaultValue={view}>
              <option value="current">Current wishes</option>
              <option value="fulfilled">Fulfilled history</option>
            </select>
          </div>
        )}
        <button className={styles["secondary-button"]} type="submit">
          Apply
        </button>
      </form>

      {wishes.length ? (
        <ul className={styles["list-grid"]}>
          {wishes.map((wish) => (
            <li key={wish.id} className={styles["list-card"]}>
              <MediaImage image={wish.image} compact />
              <h3 className={styles["wish-title"]}>
                <Link href={wishPath(listId, wish.id)}>{wish.title}</Link>
              </h3>
              <p>{formatWishPrice(wish.priceMinor, wish.currency)}</p>
              <WishPriority priority={wish.priority} />
              {canManage && (
                <p className={styles.muted}>
                  {wish.fulfilledAt
                    ? "Fulfilled"
                    : wish.hidden
                      ? "Hidden"
                      : "Visible"}
                  {wish.fulfilledAt && wish.hidden ? " · Hidden" : ""}
                  {wish.isReserved ? " · Reserved" : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles["empty-state"]}>
          <h3>
            {page > 1
              ? "No more wishes"
              : view === "fulfilled"
                ? "No fulfilled wishes yet"
                : canManage
                  ? "No wishes yet"
                  : "No wishes available"}
          </h3>
          <p className={styles.muted}>
            {page > 1
              ? "Return to an earlier page."
              : view === "fulfilled"
                ? "Wishes you mark as fulfilled will appear here."
                : canManage
                  ? "Start with just a title. You can add details later."
                  : "Check back for new wishes."}
          </p>
        </div>
      )}

      {(page > 1 || hasNextPage) && (
        <nav aria-label="Wish pages" className={styles.actions}>
          {page > 1 && <Link href={pageUrl(page - 1)}>Previous page</Link>}
          <span>Page {page}</span>
          {hasNextPage && <Link href={pageUrl(page + 1)}>Next page</Link>}
        </nav>
      )}
    </section>
  );
}
