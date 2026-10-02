import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/shell.module.css";
import { DiscoveryFilters } from "@/features/discovery/components/discovery-filters";
import {
  discoverLists,
  discoverWishes,
} from "@/features/discovery/service/discovery";
import {
  type DiscoveryQuery,
  discoveryUrl,
  parseDiscoveryQuery,
} from "@/features/discovery/service/query";
import { MediaImage } from "@/features/media/components/media-image";
import { WishPriority } from "@/features/wish/components/wish-priority";
import { formatWishPrice } from "@/features/wish/utils/money";
import { listPath, wishPath } from "@/paths";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Browse wishlists",
  robots: { index: false, follow: false },
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<DiscoveryQuery>;
}) {
  const query = await searchParams;
  const result =
    parseDiscoveryQuery(query).view === "wishes"
      ? await discoverWishes(query)
      : await discoverLists(query);
  const { filters, hasNextPage } = result;
  const empty =
    "lists" in result ? !result.lists.length : !result.wishes.length;

  return (
    <section className={styles.page}>
      <div>
        <h1>Browse wishlists</h1>
        <p className={styles.muted}>
          Explore public lists and available wishes.
        </p>
      </div>
      <nav aria-label="Browse content" className={styles.actions}>
        <Link
          href={discoveryUrl(filters, 1, "lists")}
          aria-current={filters.view === "lists" ? "page" : undefined}
        >
          Lists
        </Link>
        <Link
          href={discoveryUrl(filters, 1, "wishes")}
          aria-current={filters.view === "wishes" ? "page" : undefined}
        >
          Wishes
        </Link>
      </nav>
      <DiscoveryFilters key={JSON.stringify(filters)} filters={filters} />
      {filters.error ? (
        <p role="alert" className={styles.error}>
          {filters.error}
        </p>
      ) : empty ? (
        <div className={styles["empty-state"]}>
          <h2>{filters.page > 1 ? "No more results" : "No results found"}</h2>
          <p className={styles.muted}>
            Try different filters or check back for new public {filters.view}.
          </p>
        </div>
      ) : (
        <ul
          className={styles["list-grid"]}
          aria-label={`Public ${filters.view}`}
        >
          {"lists" in result
            ? result.lists.map((list) => (
                <li className={styles["list-card"]} key={list.id}>
                  <MediaImage image={list.image} compact />
                  <h2>
                    <Link href={listPath(list.id)}>{list.title}</Link>
                  </h2>
                  {list.description && (
                    <p className={styles.description}>
                      {list.description.slice(0, 180)}
                      {list.description.length > 180 ? "…" : ""}
                    </p>
                  )}
                  <p className={styles.muted}>
                    {list.availableWishCount} available{" "}
                    {list.availableWishCount === 1 ? "wish" : "wishes"}
                  </p>
                  {list.reservationsEnabled && (
                    <p className={styles.muted}>Reservations enabled</p>
                  )}
                </li>
              ))
            : result.wishes.map((wish) => (
                <li className={styles["list-card"]} key={wish.id}>
                  <MediaImage image={wish.image} compact />
                  <h2>
                    <Link href={wishPath(wish.wishlist.id, wish.id)}>
                      {wish.title}
                    </Link>
                  </h2>
                  <p>
                    In{" "}
                    <Link href={listPath(wish.wishlist.id)}>
                      {wish.wishlist.title}
                    </Link>
                  </p>
                  <p>{formatWishPrice(wish.priceMinor, wish.currency)}</p>
                  <WishPriority priority={wish.priority} />
                  {wish.description && (
                    <p className={styles.description}>
                      {wish.description.slice(0, 180)}
                      {wish.description.length > 180 ? "…" : ""}
                    </p>
                  )}
                </li>
              ))}
        </ul>
      )}
      {!filters.error && (filters.page > 1 || hasNextPage) && (
        <nav className={styles.actions} aria-label="Browse pages">
          {filters.page > 1 && (
            <Link href={discoveryUrl(filters, filters.page - 1)}>
              Previous page
            </Link>
          )}
          <span>Page {filters.page}</span>
          {hasNextPage && (
            <Link href={discoveryUrl(filters, filters.page + 1)}>
              Next page
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
