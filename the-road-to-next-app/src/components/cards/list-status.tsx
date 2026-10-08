import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import styles from "@/components/shell.module.css";

export function ListStatus({
  publication,
  visibility,
}: {
  publication: "DRAFT" | "PUBLISHED";
  visibility: "PUBLIC" | "PRIVATE";
}) {
  const hidden = publication === "DRAFT";
  const privateList = visibility === "PRIVATE";
  const Icon = hidden ? EyeOff : privateList ? LockKeyhole : Eye;

  return (
    <p className={`${styles.badge} ${styles["icon-label"]}`}>
      <Icon size={16} aria-hidden="true" />
      {hidden
        ? "Hidden · Admins only"
        : privateList
          ? "Visible · People with access"
          : "Visible · Anyone"}
    </p>
  );
}
