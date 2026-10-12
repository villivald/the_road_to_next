import type { ReactNode } from "react";
import styles from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";

export function AccountLayout({
  identity,
  profile,
  plan,
  avatar,
  security,
}: {
  identity: ReactNode;
  profile: ReactNode;
  plan: ReactNode;
  avatar: ReactNode;
  security: ReactNode;
}) {
  const t = useText();
  return (
    <>
      <header className={styles["page-heading"]}>
        <h1>{t("Your account")}</h1>
      </header>
      <div className={styles["content-columns"]}>
        <div className={styles["content-stack"]}>
          <section className={styles["content-panel"]}>
            {identity}
            {profile}
          </section>
          <section className={styles["content-panel"]}>
            <h2>{t("Account settings")}</h2>
            {security}
          </section>
        </div>
        <div className={styles["content-stack"]}>
          {plan}
          <div className={styles["content-panel"]}>{avatar}</div>
        </div>
      </div>
    </>
  );
}
