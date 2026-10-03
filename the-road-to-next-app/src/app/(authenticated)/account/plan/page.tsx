import Link from "next/link";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { PlanRefresh } from "@/features/premium/components/plan-refresh";
import { PromoForm } from "@/features/premium/components/promo-form";
import { readPremiumAccess } from "@/features/premium/service/entitlements";
import { accountProfilePath } from "@/paths";

export const dynamic = "force-dynamic";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);

export default async function PlanPage() {
  const { user } = await getAuthOrRedirect();
  const access = await readPremiumAccess(user.id);
  const changesAt = access.expiresAt ?? access.nextStartsAt;

  return (
    <section className={styles["account-panel"]}>
      <Link href={accountProfilePath}>Back to account</Link>
      <h1>Your plan</h1>
      <div className={styles["list-card"]}>
        <h2>{access.plan === "PREMIUM" ? "Premium" : "Free"}</h2>
        {access.expiresAt ? (
          <p>
            Premium until{" "}
            <time dateTime={access.expiresAt.toISOString()}>
              {formatDate(access.expiresAt)} UTC
            </time>
            .
          </p>
        ) : (
          <p>Public lists, wishes, and reservations are available on Free.</p>
        )}
        {access.nextStartsAt && (
          <p>
            Your next Premium period starts{" "}
            <time dateTime={access.nextStartsAt.toISOString()}>
              {formatDate(access.nextStartsAt)} UTC
            </time>
            .
          </p>
        )}
        <p className={styles.muted}>
          Promo access ends automatically. There are no charges or automatic
          renewals.
        </p>
      </div>
      <PlanRefresh changesAt={changesAt?.toISOString() ?? null} />
      <h2>Have a promo code?</h2>
      <PromoForm />
      <div className={styles.form}>
        <h2>About Premium</h2>
        <p>
          Premium is for private lists and sharing controls. These features are
          not available yet.
        </p>
        <p>
          When Premium ends, existing lists, memberships, and eligible
          reservations stay intact. New private lists and sharing invitations
          will require the list owner to have Premium. Removing access will
          remain available.
        </p>
      </div>
    </section>
  );
}
