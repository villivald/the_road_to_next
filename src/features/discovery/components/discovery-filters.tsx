import styles from "@/components/shell.module.css";
import { currencies } from "@/features/wish/utils/money";
import { localizedPath } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import { browsePath } from "@/paths";
import type { DiscoveryFilters as Filters } from "../service/query";

export function DiscoveryFilters({ filters }: { filters: Filters }) {
  const t = useText();

  const wishes = filters.view === "wishes";
  const users = filters.view === "users";

  return (
    <form
      action={localizedPath(browsePath, t.locale)}
      className={styles["filter-panel"]}
      aria-label={t("Browse filters")}
    >
      <input type="hidden" name="view" value={filters.view} />
      {filters.owner && (
        <input type="hidden" name="owner" value={filters.owner} />
      )}
      <div className={styles["form-row"]}>
        <div className={styles.field}>
          <label htmlFor="browse-search">
            {users
              ? t("Search people")
              : wishes
                ? t("Search wishes")
                : t("Search lists")}
          </label>
          <input
            id="browse-search"
            type="search"
            name="q"
            maxLength={120}
            defaultValue={filters.q}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="browse-sort">{t("Sort by")}</label>
          <select id="browse-sort" name="sort" defaultValue={filters.sort}>
            <option value="newest">{t("Newest first")}</option>
            <option value="title">
              {users ? t("Name A–Z") : t("Title A–Z")}
            </option>
            {wishes && (
              <>
                <option value="priority">{t("Highest priority")}</option>
                <option value="price-low">{t("Price: low to high")}</option>
                <option value="price-high">{t("Price: high to low")}</option>
              </>
            )}
          </select>
        </div>
      </div>
      {wishes && (
        <details
          className={styles.disclosure}
          open={
            !!(
              filters.currency ||
              filters.min ||
              filters.max ||
              filters.priority ||
              filters.sort.startsWith("price")
            )
          }
        >
          <summary>{t("Price and priority filters")}</summary>
          <div className={styles["form-row"]}>
            <div className={styles.field}>
              <label htmlFor="browse-currency">{t("Currency")}</label>
              <select
                id="browse-currency"
                name="currency"
                defaultValue={filters.currency ?? ""}
                aria-describedby="price-filter-help"
              >
                <option value="">{t("Any currency")}</option>
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="browse-min">{t("Minimum price")}</label>
              <input
                id="browse-min"
                name="min"
                inputMode="decimal"
                maxLength={24}
                defaultValue={filters.min}
                aria-describedby="price-filter-help"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="browse-max">{t("Maximum price")}</label>
              <input
                id="browse-max"
                name="max"
                inputMode="decimal"
                maxLength={24}
                defaultValue={filters.max}
                aria-describedby="price-filter-help"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="browse-priority">{t("Minimum priority")}</label>
              <select
                id="browse-priority"
                name="priority"
                defaultValue={filters.priority}
              >
                <option value="">{t("Any priority")}</option>
                {[1, 2, 3, 4, 5].map((priority) => (
                  <option key={priority} value={priority}>
                    {t.plural("{count} star", "{count} stars", priority)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p id="price-filter-help" className={styles.muted}>
            {t(
              "Choose a currency to filter or sort by price. Only wishes priced in that currency are included.",
            )}
          </p>
        </details>
      )}
      {!users && (
        <label className={styles["checkbox-label"]}>
          <input
            type="checkbox"
            name="reservable"
            defaultChecked={filters.reservable}
          />
          {t("Reservations enabled")}
        </label>
      )}
      {users && (
        <p className={styles.muted}>
          {t(
            "Find people by display name or username. Only people with a list visible to anyone appear here.",
          )}
        </p>
      )}
      <div className={styles.actions}>
        <button type="submit" className={styles.button}>
          {t("Search")}
        </button>
        <Link href={`${browsePath}?view=${filters.view}`}>
          {t("Clear filters")}
        </Link>
      </div>
    </form>
  );
}
