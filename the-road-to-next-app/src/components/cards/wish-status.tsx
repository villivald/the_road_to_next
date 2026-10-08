import { Check, Eye, EyeOff, Gift } from "lucide-react";
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
  return (
    <div className={styles.states}>
      {(hidden || (showVisible && !fulfilled)) && (
        <span className={styles.state}>
          {hidden ? (
            <EyeOff size={16} aria-hidden="true" />
          ) : (
            <Eye size={16} aria-hidden="true" />
          )}
          {hidden ? "Hidden" : "Visible"}
        </span>
      )}
      {fulfilled && (
        <span className={styles.state}>
          <Check size={16} aria-hidden="true" /> Fulfilled
        </span>
      )}
      {reserved && (
        <span className={`${styles.state} ${styles.reserved}`}>
          <Gift size={16} aria-hidden="true" />
          {reservedByYou ? "Reserved by you" : "Reserved"}
        </span>
      )}
    </div>
  );
}
