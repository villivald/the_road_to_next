import preview from "@/components/loading/loading-preview.module.css";
import shell from "@/components/shell.module.css";
import { getText } from "@/i18n/server";
import styles from "./billing.module.css";

export async function BillingSkeleton({
  checkout = false,
}: {
  checkout?: boolean;
}) {
  const t = await getText();
  return (
    <section
      className={checkout ? styles.checkout : styles.page}
      data-loading-preview
    >
      <p role="status" className={shell["visually-hidden"]}>
        {t("Loading billing details…")}
      </p>
      <div aria-hidden="true" className={styles.section}>
        <div className={`${preview.block} ${preview["back-link"]}`} />
        <div className={`${preview.block} ${preview.heading}`} />
        <div className={styles.access}>
          <div className={`${preview.block} ${preview.title}`} />
          <div className={`${preview.block} ${preview.line}`} />
          <div className={`${preview.block} ${preview.line}`} />
        </div>
        <div className={checkout ? styles.section : styles.offers}>
          {(checkout ? [0] : [0, 1]).map((index) => (
            <div className={styles.card} key={index}>
              <div className={`${preview.block} ${preview.title}`} />
              <div className={`${preview.block} ${preview.textarea}`} />
              <div className={`${preview.block} ${preview.button}`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
