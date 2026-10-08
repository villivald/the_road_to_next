import { Check, Eye, EyeOff, Gift } from "lucide-react";
import { useText } from "@/i18n/use-text";
import styles from "./cards.module.css";

export function WishStatus({
  hidden = false,
  fulfilled = false,
  reserved = false,
  reservedByYou = false,
  showVisible = false,
}: {
  hidden?: boolean;
  fulfilled?: boolean;
  reserved?: boolean;
  reservedByYou?: boolean;
  showVisible?: boolean;
}) {
  const t = useText();

  return (
    <div className={styles.states}>
      {(hidden || (showVisible && !fulfilled)) && (
        <span className={styles.state}>
          {hidden ? (
            <EyeOff size={16} aria-hidden="true" />
          ) : (
            <Eye size={16} aria-hidden="true" />
          )}
          {hidden ? t("Hidden") : t("Visible")}
        </span>
      )}
      {fulfilled && (
        <span className={styles.state}>
          <Check size={16} aria-hidden="true" /> {t("Fulfilled")}
        </span>
      )}
      {reserved && (
        <span className={`${styles.state} ${styles.reserved}`}>
          <Gift size={16} aria-hidden="true" />
          {reservedByYou ? t("Reserved by you") : t("Reserved")}
        </span>
      )}
    </div>
  );
}
