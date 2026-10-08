import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { BillingPanel } from "@/features/billing/components/billing-panel";
import { PlanRefresh } from "@/features/premium/components/plan-refresh";
import { PromoForm } from "@/features/premium/components/promo-form";
import { readPremiumAccess } from "@/features/premium/service/entitlements";
import { accountProfilePath } from "@/paths";

export const dynamic = "force-dynamic";

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
            Premium until <LocalTime value={access.expiresAt.toISOString()} />.
          </p>
        ) : (
          <p>Public lists, wishes, and reservations are available on Free.</p>
        )}
        {access.nextStartsAt && (
          <p>
            Your next Premium period starts{" "}
            <LocalTime value={access.nextStartsAt.toISOString()} />.
          </p>
        )}
        <p className={styles.muted}>
          Promo access ends automatically without charges. Subscription renewals
          are managed separately below.
        </p>
      </div>
      <PlanRefresh changesAt={changesAt?.toISOString() ?? null} />
      <BillingPanel userId={user.id} />
      <h2>Have a promo code?</h2>
      <PromoForm />
      <div className={styles.form}>
        <h2>About Premium</h2>
        <p>
          Premium lets you limit who can view your lists, send invitations,
          create guest links, and make members admins on lists you own. Invited
          people can join with a Free account.
        </p>
        <p>
          When Premium ends, existing lists, memberships, and eligible
          reservations stay intact. Creating or switching to private lists,
          inviting people, accepting invitations, creating guest links, and
          making members admins require the owner to have Premium. You can still
          remove access.
        </p>
      </div>
    </section>
  );
}
