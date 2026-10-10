import { ArrowLeft } from "lucide-react";
import loading from "@/components/loading/loading-preview.module.css";
import shell from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";
import styles from "./sharing.module.css";

export function SharingSkeleton({
  guestLinks = false,
}: {
  guestLinks?: boolean;
}) {
  const t = useText();

  const heading = guestLinks ? t("Guest links") : t("Sharing and members");

  return (
    <section className={styles.page} data-loading-preview>
      <p role="status" className={shell["visually-hidden"]}>
        {t("Loading")} {heading.toLowerCase()}…
      </p>
      <div className={styles.page} aria-hidden="true" aria-busy="true">
        <div className={styles.header}>
          <span className={styles["back-preview"]}>
            <ArrowLeft size={18} />
            {guestLinks
              ? t("Back to sharing and members")
              : t("Back to list settings")}
          </span>
          <h1>{heading}</h1>
          <div className={`${loading.block} ${loading.line}`} />
          {guestLinks && (
            <p className={shell.muted}>
              {t("Let someone view your wishes without creating an account.")}
            </p>
          )}
        </div>
        {[0, 1].map((index) => (
          <div key={index} className={styles.panel}>
            <div className={`${loading.block} ${loading.title}`} />
            <div className={`${loading.block} ${loading.line}`} />
            <div className={`${loading.block} ${loading.toolbar}`} />
            <div className={`${loading.block} ${loading.button}`} />
          </div>
        ))}
      </div>
    </section>
  );
}
