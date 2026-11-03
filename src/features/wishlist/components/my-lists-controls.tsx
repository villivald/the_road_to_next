import { QueryToggle } from "@/components/query-toggle";
import styles from "@/components/shell.module.css";
import { Link } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import { newListPath } from "@/paths";

export function MyListsControls({
  includeShared = false,
}: {
  includeShared?: boolean;
}) {
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
      <QueryToggle
        name="shared"
        checked={includeShared}
        label={t("Include shared lists")}
      />
    </>
  );
}
