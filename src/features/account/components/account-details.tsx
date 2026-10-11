import { CircleCheck, Mail, UserRound } from "lucide-react";
import styles from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";

export type AccountIdentity = { username: string; email: string };

export function AccountDetails({ user }: { user: AccountIdentity }) {
  const t = useText();
  return (
    <dl className={styles["account-details"]}>
      <div>
        <dt>
          <UserRound size={18} aria-hidden="true" /> {t("Username")}
        </dt>
        <dd>
          <span className={styles["account-value"]}>{user.username}</span>
        </dd>
      </div>
      <div>
        <dt>
          <Mail size={18} aria-hidden="true" /> {t("Email")}
        </dt>
        <dd>
          <span className={styles["account-value"]}>{user.email}</span>
          <span className={styles["verified-email"]}>
            <CircleCheck size={15} aria-hidden="true" /> {t("Verified")}
          </span>
        </dd>
      </div>
    </dl>
  );
}
