import { Star } from "lucide-react";
import styles from "@/components/shell.module.css";

export function WishPriority({ priority }: { priority: number | null }) {
  if (priority === null) {
    return null;
  }

  return (
    <span
      role="img"
      aria-label={`Priority: ${priority} out of 5 stars`}
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
