import { CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./feedback.module.css";

export function SuccessMessage({ children }: { children: ReactNode }) {
  return (
    <div role="status" className={styles.success}>
      <CircleCheck size={21} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
