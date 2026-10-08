import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/shell.module.css";
import { getAuth } from "@/features/auth/actions/get-auth";
import { DiscoveryFilters } from "@/features/discovery/components/discovery-filters";
import { DiscoveryResults } from "@/features/discovery/components/discovery-results";
import {
  discoverLists,
  discoverUsers,
  discoverWishes,
} from "@/features/discovery/service/discovery";
import {
  type DiscoveryQuery,
  discoveryUrl,
  parseDiscoveryQuery,
} from "@/features/discovery/service/query";

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
  const { user } = await getAuth();
  const view = parseDiscoveryQuery(query).view;
  const result =
    view === "users"
      ? await discoverUsers(query, user?.id)
      : view === "wishes"
        ? await discoverWishes(query, user?.id)
        : await discoverLists(query, user?.id);
  const { filters, hasNextPage } = result;
  const empty =
    "lists" in result
      ? !result.lists.length
      : "wishes" in result
        ? !result.wishes.length
        : !result.users.length;

  return (
    <section className={styles.page}>
      <div className={styles["page-heading"]}>
        <div>
          <h1>Browse wishlists</h1>
          <p className={styles.muted}>
            Explore public lists, available wishes, and the people behind them.
          </p>
        </div>
      </div>
      <nav aria-label="Browse content" className={styles.tabs}>
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
        <Link
          href={discoveryUrl(filters, 1, "users")}
          aria-current={filters.view === "users" ? "page" : undefined}
        >
          People
        </Link>
      </nav>
      {filters.owner && (
        <p className={styles.notice}>
          Public lists and wishes by @{filters.owner}.{" "}
          <Link href="/browse?view=users">Find another person</Link>
        </p>
      )}
      <DiscoveryFilters key={JSON.stringify(filters)} filters={filters} />
      {filters.error ? (
        <p role="alert" className={styles.error}>
          {filters.error}
        </p>
      ) : empty ? (
        <div className={styles["empty-state"]}>
          <Search aria-hidden="true" />
          <h2>{filters.page > 1 ? "No more results" : "No results found"}</h2>
          <p className={styles.muted}>
            {filters.view === "users"
              ? "Try another name or username. Only people with a list visible to anyone appear here."
              : `Try different filters or check back for new public ${filters.view}.`}
          </p>
        </div>
      ) : (
        <DiscoveryResults result={result} />
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
