import {
  ArrowUpRight,
  Pencil,
  Settings,
  Share2,
  UserRound,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import styles from "./cards.module.css";
import { CopyLink } from "./copy-link";

export function OwnershipBadge({
  user = false,
  edge = false,
}: {
  user?: boolean;
  edge?: boolean;
}) {
  const t = useText();

  return (
    <span className={`${styles.ownership} ${edge ? styles["edge-badge"] : ""}`}>
      <UserRound size={15} aria-hidden="true" />
      {user ? t("You") : t("Your list")}
    </span>
  );
}

export function CardActions({
  path,
  title,
  canManage = false,
  sharingPath,
  settingsPath,
  canCopy = false,
}: {
  path: string;
  title: string;
  canManage?: boolean;
  sharingPath?: string;
  settingsPath?: string;
  canCopy?: boolean;
}) {
  const t = useText();

  return (
    <div className={styles.actions}>
      <Link
        href={path}
        className={styles["open-action"]}
        aria-label={t("View {value0}", { value0: title })}
      >
        {t("View")} <ArrowUpRight size={18} aria-hidden="true" />
      </Link>
      <div className={styles.tools}>
        {canCopy && <CopyLink path={path} title={title} />}
        {canManage && (
          <Link
            href={settingsPath ?? `${path}/edit`}
            className={styles["icon-action"]}
            aria-label={t(
              settingsPath ? "Settings for {value0}" : "Edit {value0}",
              { value0: title },
            )}
            title={settingsPath ? t("List settings") : t("Edit")}
          >
            {settingsPath ? (
              <Settings size={18} aria-hidden="true" />
            ) : (
              <Pencil size={18} aria-hidden="true" />
            )}
          </Link>
        )}
        {sharingPath && (
          <Link
            href={sharingPath}
            className={styles["icon-action"]}
            aria-label={t("Manage sharing for {value0}", { value0: title })}
            title={t("Manage sharing")}
          >
            <Share2 size={18} aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}
