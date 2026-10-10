import { Gift, Heart, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { LocalTime } from "@/components/local-time";
import shell from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import styles from "@/features/billing/components/billing.module.css";
import { BillingPanel } from "@/features/billing/components/billing-panel";
import { readBillingOverview } from "@/features/billing/service/overview";
import { PlanRefresh } from "@/features/premium/components/plan-refresh";
import { PromoForm } from "@/features/premium/components/promo-form";
import { readPremiumAccess } from "@/features/premium/service/entitlements";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import { accountProfilePath } from "@/paths";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const t = await getText();
  const { user } = await getAuthOrRedirect();
  const returned = (await searchParams).checkout === "returned";
  const [access, overview] = await Promise.all([
    readPremiumAccess(user.id),
    readBillingOverview(user.id),
  ]);
  const premium = access.plan === "PREMIUM";

  return (
    <section className={styles.page}>
      <Link href={accountProfilePath}>{t("Back to account")}</Link>
      <div className={styles.section}>
        <h1>{t("Your plan")}</h1>
        <p className={shell.muted}>
          {t("Your access, subscription, and payment settings in one place.")}
        </p>
      </div>
      <section className={styles.access} aria-labelledby="access-heading">
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{t("Current access")}</p>
            <h2 id="access-heading">{premium ? "Premium" : t("Free")}</h2>
          </div>
          {premium ? (
            <Sparkles size={28} aria-hidden="true" />
          ) : (
            <Heart size={28} aria-hidden="true" />
          )}
        </div>
        {access.expiresAt ? (
          <p>
            {t("Premium until")}{" "}
            <LocalTime value={access.expiresAt.toISOString()} dateOnly />.
          </p>
        ) : (
          <p>
            {t("Public lists, wishes, and reservations are available on Free.")}
          </p>
        )}
        {access.nextStartsAt && (
          <p>
            {t("Your next Premium period starts")}{" "}
            <LocalTime value={access.nextStartsAt.toISOString()} dateOnly />.
          </p>
        )}
        {overview.hasPromo && (
          <p className={styles.meta}>
            {overview.active
              ? t(
                  "Your access includes promo time. Promo codes do not change subscription payment dates.",
                )
              : t(
                  "Promo access ends automatically. It never creates a payment or subscription.",
                )}
          </p>
        )}
        {premium && !overview.hasPromo && overview.active && (
          <p className={styles.meta}>
            {t(
              "This is your currently confirmed access. Future successful payments extend it.",
            )}
          </p>
        )}
      </section>
      <PlanRefresh
        changesAt={
          (access.expiresAt ?? access.nextStartsAt)?.toISOString() ?? null
        }
      />
      <BillingPanel overview={overview} returned={returned} />
      <div className={styles.help}>
        <section className={styles.card} aria-labelledby="promo-heading">
          <h2 id="promo-heading" className={styles.fact}>
            <Gift size={21} aria-hidden="true" />
            {t("Have a promo code?")}
          </h2>
          <PromoForm />
        </section>
        <section className={styles.card} aria-labelledby="premium-heading">
          <h2 id="premium-heading" className={styles.fact}>
            <ShieldCheck size={21} aria-hidden="true" />
            {t("About Premium")}
          </h2>
          <ul className={styles.benefits}>
            <li>{t("Choose who can see your lists.")}</li>
            <li>{t("Invite people or share a private guest link.")}</li>
            <li>{t("Let trusted members help manage your lists.")}</li>
          </ul>
          <p className={styles.meta}>
            {t("Invited people can join with a Free account.")}
          </p>
          <details className={shell.disclosure}>
            <summary>{t("What happens when Premium ends?")}</summary>
            <p>
              {t(
                "Your lists and existing access stay in place. New private sharing, invitations, guest links, and admin assignments require Premium. You can still remove access.",
              )}
            </p>
          </details>
        </section>
      </div>
      <section className={styles.card} aria-labelledby="billing-help-heading">
        <h2 id="billing-help-heading">{t("Billing help")}</h2>
        <details className={shell.disclosure}>
          <summary>{t("Canceling or changing a plan")}</summary>
          <p>
            {t(
              "Open Manage subscription to stop renewal in Paddle. Your paid access remains until its end date. To switch between monthly and annual billing, cancel renewal and choose the other plan after your paid period ends.",
            )}
          </p>
        </details>
        <details className={shell.disclosure}>
          <summary>{t("Receipts and refunds")}</summary>
          <p>
            {t(
              "Use Manage subscription to find your payment history in Paddle. Request refunds through Paddle. A full approved refund removes access from that payment; partial refunds preserve it. Refunds do not stop renewal or remove promo access.",
            )}
          </p>
        </details>
        <p className={styles.meta}>
          {t("Need help with a payment?")}{" "}
          <a href="mailto:support@wishlist.fi" className={styles.fact}>
            <Mail size={16} aria-hidden="true" />
            support@wishlist.fi
          </a>
        </p>
      </section>
    </section>
  );
}
