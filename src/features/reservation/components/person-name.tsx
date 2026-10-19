import styles from "@/components/shell.module.css";
import groupStyles from "./groups.module.css";

export function PersonName({
  person,
}: {
  person: { name: string | null; username: string };
}) {
  const name = person.name?.trim() || person.username;
  return (
    <span className={groupStyles["person-name"]}>
      <strong>{name}</strong>
      {name.toLowerCase() !== person.username.toLowerCase() && (
        <span className={styles.muted}>@{person.username}</span>
      )}
    </span>
  );
}
