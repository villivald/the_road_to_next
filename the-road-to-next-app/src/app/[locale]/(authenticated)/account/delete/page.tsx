import styles from "@/components/shell.module.css";
import { DeleteAccountForm } from "@/features/account/components/delete-account-form";
import { readDeletionImpact } from "@/features/account/service/account";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import { accountDeletePath, accountProfilePath } from "@/paths";

export default async function DeleteAccountPage() {
  const t = await getText();

  const { user } = await getAuthOrRedirect();
  const impact = await readDeletionImpact(user.id);

  return (
    <section className={styles.editor}>
      <h1>{t("Delete your account")}</h1>
      <p>
        {t(
          "This permanently removes your profile, avatar, sign-in sessions, and recovery codes. Any remaining Premium access is lost, and redeemed promo uses are not restored. You cannot undo this.",
        )}
      </p>
      <p>
        {t(
          "Deleting your account requests immediate subscription cancellation. If Paddle is unavailable, cancellation is retried. A payment already in progress may still complete; contact Paddle to request a refund. Deleting your account does not refund previous payments. Paddle retains payment records as required by law.",
        )}
      </p>
      <dl className={styles.details}>
        <div>
          <dt>{t("Subscriptions to cancel")}</dt>
          <dd>{impact.subscriptionCount}</dd>
        </div>
        <div>
          <dt>{t("Pending checkouts to close")}</dt>
          <dd>{impact.checkoutCount}</dd>
        </div>
        <div>
          <dt>{t("Lists transferred to another admin")}</dt>
          <dd>{impact.transferCount}</dd>
        </div>
        <div>
          <dt>{t("Lists archived and inaccessible to everyone")}</dt>
          <dd>{impact.archiveCount}</dd>
        </div>
        <div>
          <dt>{t("Your active reservations canceled")}</dt>
          <dd>{impact.reservationCount}</dd>
        </div>
        <div>
          <dt>{t("Your list memberships removed")}</dt>
          <dd>{impact.membershipCount}</dd>
        </div>
      </dl>
      {impact.lists.length > 0 && (
        <div className={styles.form}>
          <h2>{t("Your owned lists")}</h2>
          <ul className={styles["list-grid"]}>
            {impact.lists.map((list) => (
              <li key={list.id} className={styles["list-card"]}>
                <h3>{list.title}</h3>
                <p>
                  {list.successor
                    ? t("Transfer to {value0}", { value0: list.successor })
                    : t("Archive; no one can access it")}
                </p>
              </li>
            ))}
          </ul>
          {impact.listCount > impact.lists.length && (
            <p>
              {t(
                "{shown} of {total} owned lists. The totals above include all lists.",
                { shown: impact.lists.length, total: impact.listCount },
              )}
            </p>
          )}
        </div>
      )}
      <p>
        {t(
          "List and wish content stays after your account is removed. Each active list goes to its earliest remaining admin; lists without one are archived. Other people’s eligible reservations stay on transferred lists. Archiving cancels every reservation on that list.",
        )}
      </p>
      <p className={styles.muted}>
        {t(
          "Your avatar becomes inaccessible immediately and is queued for file deletion. Archived list content and images are retained privately.",
        )}
      </p>
      <DeleteAccountForm
        key={impact.impactToken}
        impactToken={impact.impactToken}
      />
      <div className={styles.actions}>
        <Link href={accountProfilePath}>{t("Keep my account")}</Link>
        <Link href={accountDeletePath}>{t("Refresh deletion summary")}</Link>
      </div>
    </section>
  );
}
