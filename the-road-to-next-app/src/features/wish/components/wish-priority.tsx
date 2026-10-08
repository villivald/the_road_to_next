import { Star } from "lucide-react";
import styles from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";

export function WishPriority({ priority }: { priority: number | null }) {
  const t = useText();

  if (priority === null) {
    return null;
  }

  return (
    <span
      role="img"
      aria-label={t("Priority: {value0} out of 5 stars", { value0: priority })}
      className={styles.priority}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={18}
          strokeWidth={1.75}
          data-filled={star <= priority}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
