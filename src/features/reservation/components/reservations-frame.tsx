import { Gift } from "lucide-react";
import type { ReactNode } from "react";
import loadingStyles from "@/components/loading/loading-preview.module.css";
import styles from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";

export function ReservationsFrame({
  children,
  loading = false,
}: {
  children: ReactNode;
  loading?: boolean;
}) {
  const t = useText();

  return (
    <section
      className={styles.page}
      data-loading-preview={loading ? "reservations" : undefined}
    >
      {loading && (
        <p role="status" className={styles["visually-hidden"]}>
          {t("Loading your reservations…")}
        </p>
      )}
      <div className={styles["page-heading"]}>
        <div>
          <h1>{t("My reservations")}</h1>
          <p className={styles.muted}>
            {t("Gifts you plan to get. Your identity is private.")}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function EmptyReservations({
  page = 1,
  loading = false,
}: {
  page?: number;
  loading?: boolean;
}) {
  const t = useText();

  const textPreview = loading
    ? `${loadingStyles.block} ${loadingStyles["skeleton-text"]}`
    : "";

  return (
    <div
      className={styles["empty-state"]}
      aria-hidden={loading || undefined}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <div
          className={`${loadingStyles.block} ${loadingStyles["empty-icon"]}`}
        />
      ) : (
        <Gift aria-hidden="true" />
      )}
      <h2 className={textPreview}>
        {page === 1 ? t("No active reservations") : t("No more reservations")}
      </h2>
      <p className={`${styles.muted} ${textPreview}`}>
        {page === 1
          ? t("Open a shared wishlist and reserve a wish to find it here.")
          : t("Return to an earlier page.")}
      </p>
    </div>
  );
}

export function ReservationHelp() {
  const t = useText();

  return (
    <p className={styles.muted}>
      {t(
        "A reservation ends when its wish is hidden, fulfilled, or deleted, its list is hidden, or you lose access to the list.",
      )}
    </p>
  );
}
