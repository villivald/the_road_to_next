import Link from "next/link";
import styles from "@/components/shell.module.css";
import { currencies } from "@/features/wish/utils/money";
import { browsePath } from "@/paths";
import type { DiscoveryFilters as Filters } from "../service/query";

export function DiscoveryFilters({ filters }: { filters: Filters }) {
  const wishes = filters.view === "wishes";
  const users = filters.view === "users";

  return (
    <form
      action={browsePath}
      className={styles["filter-panel"]}
      aria-label="Browse filters"
    >
      <input type="hidden" name="view" value={filters.view} />
      {filters.owner && (
        <input type="hidden" name="owner" value={filters.owner} />
      )}
      <div className={styles["form-row"]}>
        <div className={styles.field}>
          <label htmlFor="browse-search">
            Search {users ? "people" : filters.view}
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
          <label htmlFor="browse-sort">Sort by</label>
          <select id="browse-sort" name="sort" defaultValue={filters.sort}>
            <option value="newest">Newest first</option>
            <option value="title">{users ? "Name A–Z" : "Title A–Z"}</option>
            {wishes && (
              <>
                <option value="priority">Highest priority</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
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
          <summary>Price and priority filters</summary>
          <div className={styles["form-row"]}>
            <div className={styles.field}>
              <label htmlFor="browse-currency">Currency</label>
              <select
                id="browse-currency"
                name="currency"
                defaultValue={filters.currency ?? ""}
                aria-describedby="price-filter-help"
              >
                <option value="">Any currency</option>
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="browse-min">Minimum price</label>
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
              <label htmlFor="browse-max">Maximum price</label>
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
              <label htmlFor="browse-priority">Minimum priority</label>
              <select
                id="browse-priority"
                name="priority"
                defaultValue={filters.priority}
              >
                <option value="">Any priority</option>
                {[1, 2, 3, 4, 5].map((priority) => (
                  <option key={priority} value={priority}>
                    {priority} {priority === 1 ? "star" : "stars"}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p id="price-filter-help" className={styles.muted}>
            Choose a currency to filter or sort by price. Only wishes priced in
            that currency are included.
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
          Reservations enabled
        </label>
      )}
      {users && (
        <p className={styles.muted}>
          Find people by display name or username. Only people with a list
          visible to anyone appear here.
        </p>
      )}
      <div className={styles.actions}>
        <button type="submit" className={styles.button}>
          Search
        </button>
        <Link href={`${browsePath}?view=${filters.view}`}>Clear filters</Link>
      </div>
    </form>
  );
}
