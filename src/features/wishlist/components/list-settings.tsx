import { Trash2 } from "lucide-react";
import managementStyles from "@/components/list-management.module.css";
import styles from "@/components/shell.module.css";
import { Link } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import { listPath } from "@/paths";
import settingsStyles from "./list-settings.module.css";

export function ListDeletionSettings({ id }: { id: string }) {
  const t = useText();
  return (
    <section
      className={managementStyles.panel}
      aria-labelledby="list-delete-heading"
    >
      <h2 id="list-delete-heading">{t("Delete list")}</h2>
      <div className={settingsStyles.deletion}>
        <p className={styles.muted}>
          {t("Permanently remove this list and its wishes.")}
        </p>
        <Link
          className={settingsStyles["delete-link"]}
          href={`${listPath(id)}/delete`}
        >
          <Trash2 size={18} aria-hidden="true" /> {t("Delete list")}
        </Link>
      </div>
    </section>
  );
}
