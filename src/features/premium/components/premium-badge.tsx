import { Sparkles } from "lucide-react";
import styles from "./personalization.module.css";

export function PremiumBadge() {
  return (
    <span className={styles.badge}>
      <Sparkles aria-hidden="true" /> Premium
    </span>
  );
}
