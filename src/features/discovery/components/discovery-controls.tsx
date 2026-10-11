import styles from "@/components/shell.module.css";
import { DiscoveryFilters } from "@/features/discovery/components/discovery-filters";
import {
  type DiscoveryFilters as Filters,
  discoveryUrl,
} from "@/features/discovery/service/query";
import { Link } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";

export function BrowseControls({ filters }: { filters: Filters }) {
  const t = useText();
  return (
    <>
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
        {(["lists", "wishes", "users"] as const).map((view) => (
          <Link
            key={view}
            href={discoveryUrl(filters, 1, view)}
            aria-current={filters.view === view ? "page" : undefined}
          >
            {t(
              view === "lists"
                ? "Lists"
                : view === "wishes"
                  ? "Wishes"
                  : "People",
            )}
          </Link>
        ))}
      </nav>
      {filters.owner && (
        <p className={styles.notice}>
          {t("Public lists and wishes by @")}
          {filters.owner}.{" "}
          <Link href="/browse?view=users">{t("Find another person")}</Link>
        </p>
      )}
      <DiscoveryFilters key={JSON.stringify(filters)} filters={filters} />
    </>
  );
}
