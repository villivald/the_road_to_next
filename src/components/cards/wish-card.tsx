import type { ReactNode } from "react";
import shell from "@/components/shell.module.css";
import styles from "./cards.module.css";
import type { WishTone } from "./wish-tones";

export { wishTone } from "./wish-tones";

export function WishCard({
  children,
  tone = "butter",
}: {
  children: ReactNode;
  tone?: WishTone;
}) {
  return (
    <li
      className={`${shell["list-card"]} ${styles.tone} ${styles["wish-card"]}`}
      data-wish-tone={tone}
    >
      {children}
    </li>
  );
}
