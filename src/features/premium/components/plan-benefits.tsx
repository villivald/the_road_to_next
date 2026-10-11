import styles from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";

export function PlanBenefits() {
  const t = useText();
  return (
    <>
      <ul>
        <li>{t("Choose who can see your lists.")}</li>
        <li>{t("Invite people or share a private guest link.")}</li>
        <li>{t("Let trusted members help manage your lists.")}</li>
      </ul>
      <p>
        {t(
          "Only the list owner needs Premium. People you invite can view or reserve wishes with a Free account.",
        )}
      </p>
      <p>
        {t(
          "Guest links provide read-only access without an account. Reserving requires a verified account.",
        )}
      </p>
      <details className={styles.disclosure}>
        <summary>{t("What happens when Premium ends?")}</summary>
        <p>
          {t(
            "Your lists and existing access stay in place. New private sharing, invitations, guest links, and admin assignments require Premium. You can still remove access.",
          )}
        </p>
      </details>
    </>
  );
}
