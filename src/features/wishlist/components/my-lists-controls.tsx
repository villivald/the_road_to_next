import styles from "@/components/shell.module.css";
import { Link } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import { newListPath, sharedListsPath } from "@/paths";

export function MyListsControls() {
  const t = useText();
  return (
    <>
      <div className={styles["page-heading"]}>
        <div>
          <h1>{t("My lists")}</h1>
          <p className={styles.muted}>{t("Your wishes, in one place.")}</p>
        </div>
        <Link href={newListPath} className={styles.button}>
          {t("Create a list")}
        </Link>
      </div>
      <Link href={sharedListsPath} className={styles["catalog-link"]}>
        {t("Lists shared with you")}
      </Link>
    </>
  );
}
