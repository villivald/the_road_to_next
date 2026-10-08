import { ArrowLeft } from "lucide-react";
import loading from "@/components/loading/loading-preview.module.css";
import shell from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";
import styles from "./list-settings.module.css";

export function ListSettingsSkeleton() {
  const t = useText();

  return (
    <section className={styles.page} data-loading-preview>
      <p role="status" className={shell["visually-hidden"]}>
        {t("Loading")} {t("List settings").toLowerCase()}…
      </p>
      <div className={styles.page} aria-hidden="true" aria-busy="true">
        <div className={styles.header}>
          <span className={styles["back-preview"]}>
            <ArrowLeft size={18} /> {t("Back to list")}
          </span>
          <h1>{t("List settings")}</h1>
          <div className={`${loading.block} ${loading.line}`} />
        </div>
        <div className={styles.settings}>
          <h2>{t("Details and reservations")}</h2>
          <div className={`${loading.block} ${loading.label}`} />
          <div className={`${loading.block} ${loading.input}`} />
          <div className={`${loading.block} ${loading.line}`} />
          <div className={`${loading.block} ${loading.label}`} />
          <div className={`${loading.block} ${loading.textarea}`} />
          <div className={`${loading.block} ${loading.line}`} />
          <div className={`${loading.block} ${loading.toolbar}`} />
          <div className={`${loading.block} ${loading.button}`} />
        </div>
        {[0, 1, 2].map((index) => (
          <div key={index} className={styles.settings}>
            <div className={`${loading.block} ${loading.title}`} />
            <div className={`${loading.block} ${loading.toolbar}`} />
            <div className={`${loading.block} ${loading.button}`} />
          </div>
        ))}
      </div>
    </section>
  );
}
