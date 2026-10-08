import { Search } from "lucide-react";
import type { Metadata } from "next";
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
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getText();
  return {
    title: t("Browse wishlists"),
    robots: { index: false, follow: false },
  };
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<DiscoveryQuery>;
}) {
  const t = await getText();

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
          <h1>{t("Browse wishlists")}</h1>
          <p className={styles.muted}>
            {t(
              "Explore public lists, available wishes, and the people behind them.",
            )}
          </p>
        </div>
      </div>
      <nav aria-label={t("Browse content")} className={styles.tabs}>
        <Link
          href={discoveryUrl(filters, 1, "lists")}
          aria-current={filters.view === "lists" ? "page" : undefined}
        >
          {t("Lists")}
        </Link>
        <Link
          href={discoveryUrl(filters, 1, "wishes")}
          aria-current={filters.view === "wishes" ? "page" : undefined}
        >
          {t("Wishes")}
        </Link>
        <Link
          href={discoveryUrl(filters, 1, "users")}
          aria-current={filters.view === "users" ? "page" : undefined}
        >
          {t("People")}
        </Link>
      </nav>
      {filters.owner && (
        <p className={styles.notice}>
          {t("Public lists and wishes by @")}
          {filters.owner}.{" "}
          <Link href="/browse?view=users">{t("Find another person")}</Link>
        </p>
      )}
      <DiscoveryFilters key={JSON.stringify(filters)} filters={filters} />
      {filters.error ? (
        <p role="alert" className={styles.error}>
          {t.message(filters.error)}
        </p>
      ) : empty ? (
        <div className={styles["empty-state"]}>
          <Search aria-hidden="true" />
          <h2>
            {filters.page > 1 ? t("No more results") : t("No results found")}
          </h2>
          <p className={styles.muted}>
            {filters.view === "users"
              ? t(
                  "Try another name or username. Only people with a list visible to anyone appear here.",
                )
              : t(
                  "Try different filters or check back for new public {value0}.",
                  {
                    value0: filters.view === "lists" ? t("lists") : t("wishes"),
                  },
                )}
          </p>
        </div>
      ) : (
        <DiscoveryResults result={result} />
      )}
      {!filters.error && (filters.page > 1 || hasNextPage) && (
        <nav className={styles.actions} aria-label={t("Browse pages")}>
          {filters.page > 1 && (
            <Link href={discoveryUrl(filters, filters.page - 1)}>
              {t("Previous page")}
            </Link>
          )}
          <span>
            {t("Page")} {filters.page}
          </span>
          {hasNextPage && (
            <Link href={discoveryUrl(filters, filters.page + 1)}>
              {t("Next page")}
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
