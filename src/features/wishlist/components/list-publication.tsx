import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useText } from "@/i18n/use-text";
import styles from "./list-publication.module.css";
import { PublicationControl } from "./publication-control";

export function ListPublication({
  list,
}: {
  list: {
    id: string;
    publication: "DRAFT" | "PUBLISHED";
    visibility: "PUBLIC" | "PRIVATE";
  };
}) {
  const t = useText();
  const visible = list.publication === "PUBLISHED";
  const anyone = list.visibility === "PUBLIC";
  const Icon = !visible ? EyeOff : anyone ? Eye : LockKeyhole;

  return (
    <section
      id="list-visibility"
      className={styles.panel}
      aria-label={t("List visibility")}
    >
      <p className={styles.status}>
        <Icon size={20} aria-hidden="true" />
        <strong>
          <span className={styles["full-status"]}>
            {!visible
              ? t("Hidden · Admins only")
              : anyone
                ? t("Visible · Public list")
                : t("Visible · Private list")}
          </span>
          <span className={styles["short-status"]} aria-hidden="true">
            {t(!visible ? "Hidden" : anyone ? "Public list" : "Private list")}
          </span>
        </strong>
      </p>
      <p className={styles.help}>
        {visible
          ? t("Hiding the list ends its active reservations.")
          : anyone
            ? t("Showing it makes it public, including in Browse.")
            : t(
                "Showing it keeps access limited to invited people and active guest links.",
              )}
      </p>
      <PublicationControl id={list.id} visible={visible} secondary={visible} />
    </section>
  );
}
