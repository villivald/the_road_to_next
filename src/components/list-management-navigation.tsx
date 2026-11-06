import { Settings, UsersRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import { listPath, listSettingsPath, sharingPath } from "@/paths";
import { BackLink } from "./back-link";
import styles from "./list-management.module.css";

export function ListManagementNavigation({
  listId,
  current,
}: {
  listId: string;
  current: "settings" | "access";
}) {
  const t = useText();
  const settings = current === "access";
  const Icon = settings ? Settings : UsersRound;
  return (
    <nav className={styles.navigation} aria-label={t("List tools")}>
      <BackLink href={listPath(listId)}>{t("Back to list")}</BackLink>
      <Link href={settings ? listSettingsPath(listId) : sharingPath(listId)}>
        <Icon size={18} aria-hidden="true" />
        {settings ? t("List settings") : t("List access")}
      </Link>
    </nav>
  );
}
