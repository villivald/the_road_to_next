import { Gift, List } from "lucide-react";
import { useText } from "@/i18n/use-text";
import styles from "./cards.module.css";

export function ListWishCounts({
  availableWishCount,
  reservedWishCount,
}: {
  availableWishCount: number;
  reservedWishCount: number;
}) {
  const t = useText();

  return (
    <p className={styles["list-counts"]}>
      <span>
        <List size={16} aria-hidden="true" />
        {t("{count} available", { count: availableWishCount })}
      </span>
      <span>
        <Gift size={16} aria-hidden="true" />
        {t("{count} reserved", { count: reservedWishCount })}
      </span>
    </p>
  );
}
