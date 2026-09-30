import type { ReactNode } from "react";
import styles from "./shell.module.css";

export function AccountPanel({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className={styles["account-panel"]}>
      <h1>{title}</h1>
      <p className={styles.muted}>{description}</p>
      {children}
      {footer && <div className={styles["form-footer"]}>{footer}</div>}
    </section>
  );
}
