import { ArrowUpRight, Pencil, Share2, UserRound } from "lucide-react";
import Link from "next/link";
import styles from "./cards.module.css";
import { CopyLink } from "./copy-link";

export function OwnershipBadge({
  user = false,
  edge = false,
}: {
  user?: boolean;
  edge?: boolean;
}) {
  return (
    <span className={`${styles.ownership} ${edge ? styles["edge-badge"] : ""}`}>
      <UserRound size={15} aria-hidden="true" />
      {user ? "You" : "Your list"}
    </span>
  );
}

export function CardActions({
  path,
  title,
  canManage = false,
  sharingPath,
  canCopy = false,
}: {
  path: string;
  title: string;
  canManage?: boolean;
  sharingPath?: string;
  canCopy?: boolean;
}) {
  return (
    <div className={styles.actions}>
      <Link
        href={path}
        className={styles["open-action"]}
        aria-label={`View ${title}`}
      >
        View <ArrowUpRight size={18} aria-hidden="true" />
      </Link>
      <div className={styles.tools}>
        {canCopy && <CopyLink path={path} title={title} />}
        {canManage && (
          <Link
            href={`${path}/edit`}
            className={styles["icon-action"]}
            aria-label={`Edit ${title}`}
            title="Edit"
          >
            <Pencil size={18} aria-hidden="true" />
          </Link>
        )}
        {sharingPath && (
          <Link
            href={sharingPath}
            className={styles["icon-action"]}
            aria-label={`Manage sharing for ${title}`}
            title="Manage sharing"
          >
            <Share2 size={18} aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}
