import { ActionForm } from "@/components/form/action-form";
import { LocalTime } from "@/components/local-time";
import styles from "@/components/shell.module.css";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import { prisma } from "@/lib/prisma";
import {
  abandonCheckout,
  manageSubscription,
  refreshBilling,
  subscribe,
} from "../actions/manage-billing";
import { billingEnabled, type BillingInterval, plans } from "../service/config";
import { BillingRefresh } from "./billing-refresh";
import { CheckoutReturn } from "./checkout-return";

export async function BillingPanel({
  userId,
  returned = false,
}: {
  userId: string;
  returned?: boolean;
}) {
  const t = await getText();

  const account = await prisma.billingAccount.findUnique({
    where: { userId },
    include: {
      subscriptions: { orderBy: { updatedAt: "desc" }, take: 10 },
      checkouts: { where: { closedAt: null }, take: 1 },
    },
  });
  const pending = account?.checkouts[0];
  const active = account?.subscriptions.some(
    (subscription) => subscription.status !== "canceled",
  );
  const paid = account
    ? await prisma.billingPayment.count({
        where: {
          subscription: { accountId: account.id },
          refunded: false,
          expiresAt: { gt: new Date() },
        },
      })
    : 0;

  const pendingCard = pending && (
    <div className={styles["list-card"]}>
      <h3>{t("Unfinished checkout")}</h3>
      <p>
        {pending.cancelRequested
          ? t("Closing checkout. Refresh billing to check the result.")
          : t(
              "Resume your existing checkout, or discard it before selecting another plan.",
            )}
      </p>
      {pending.transactionId && !pending.cancelRequested && (
        <Link href={`/account/checkout?id=${pending.id}`}>
          {t("Resume checkout")}
        </Link>
      )}
      {!pending.cancelRequested && (
        <ActionForm
          action={abandonCheckout}
          label={t("Discard checkout")}
          pendingLabel={t("Closing…")}
        >
          {null}
        </ActionForm>
      )}
      {!pending.transactionId && (
        <p>
          {t(
            "Your checkout is still being confirmed. Select Refresh billing shortly. If it stays unfinished,",
          )}{" "}
          <Link href="/about">{t("contact support")}</Link>
          {t(". We will not start another payment automatically.")}
        </p>
      )}
    </div>
  );

  return (
    <div className={styles.form}>
      <h2>{t("Subscription")}</h2>
      {!billingEnabled() ? (
        <p>
          {t(
            "Subscriptions are not available yet. You can still use a promo code.",
          )}
        </p>
      ) : (
        <>
          {!!account?.subscriptions.length && <BillingRefresh />}
          <p className={styles.notice}>
            {t(
              "Sandbox billing · Test payments only. No real money is charged.",
            )}
          </p>
          <p>
            {t(
              "Subscriptions renew automatically. Use Manage subscription to cancel renewal; paid access lasts until the end of your paid period. A failed renewal does not extend access. Promo codes do not change payment dates.",
            )}
          </p>
          {account?.subscriptions.map((subscription) => (
            <div className={styles["list-card"]} key={subscription.id}>
              <h3>
                {subscription.interval === "year"
                  ? t("Annual subscription")
                  : t("Monthly subscription")}
              </h3>
              <p>
                {t("Status:")}{" "}
                {subscription.status === "past_due"
                  ? t("Payment overdue")
                  : subscription.cancelAt && subscription.status !== "canceled"
                    ? t("Renewal canceled")
                    : ({
                        active: t("Active subscription"),
                        canceled: t("Canceled subscription"),
                        paused: t("Paused subscription"),
                        trialing: t("Trialing subscription"),
                      }[subscription.status] ??
                      t("Subscription status unavailable"))}
              </p>
              {subscription.cancelAt ? (
                <>
                  <p>
                    {t("Subscription ends on")}{" "}
                    <LocalTime value={subscription.cancelAt.toISOString()} />.
                  </p>
                  <p>{t("This subscription will not renew.")}</p>
                </>
              ) : subscription.nextBilledAt &&
                subscription.status !== "canceled" ? (
                <p>
                  {t("Next payment:")}{" "}
                  <LocalTime value={subscription.nextBilledAt.toISOString()} />.
                </p>
              ) : null}
              <ActionForm
                action={manageSubscription.bind(null, subscription.id)}
                label={t("Manage subscription")}
                pendingLabel={t("Opening Paddle…")}
              >
                <p>
                  {t(
                    subscription.cancelAt || subscription.status === "canceled"
                      ? "View payments and subscription details in Paddle."
                      : "View payments, update your payment method, or cancel in Paddle.",
                  )}
                </p>
              </ActionForm>
            </div>
          ))}
          {pending ? (
            returned ? (
              <CheckoutReturn key={pending.id}>{pendingCard}</CheckoutReturn>
            ) : (
              pendingCard
            )
          ) : !active && !paid ? (
            <div className={styles["list-grid"]}>
              {(Object.keys(plans) as BillingInterval[]).map((interval) => (
                <div className={styles["list-card"]} key={interval}>
                  <h3>{t.message(plans[interval].display)}</h3>
                  <p>
                    {t(
                      "Includes applicable tax. Premium starts after payment confirmation.",
                    )}
                  </p>
                  <ActionForm
                    action={subscribe.bind(null, interval)}
                    label={t("Choose {value0}", {
                      value0:
                        interval === "month"
                          ? t("Monthly").toLowerCase()
                          : t("Annual").toLowerCase(),
                    })}
                    pendingLabel={t("Preparing checkout…")}
                  >
                    <label className={styles["checkbox-label"]}>
                      <input
                        name="confirm"
                        type="checkbox"
                        value="yes"
                        required
                      />
                      {t(
                        interval === "month"
                          ? "I agree to automatic monthly renewal at {price} until canceled."
                          : "I agree to automatic annual renewal at {price} until canceled.",
                        { price: t.message(plans[interval].display) },
                      )}
                    </label>
                  </ActionForm>
                </div>
              ))}
            </div>
          ) : !active ? (
            <p>
              {t(
                "Your paid period is still active. You can choose another plan after it ends.",
              )}
            </p>
          ) : null}
          <ActionForm
            action={refreshBilling}
            label={t("Refresh billing")}
            pendingLabel={t("Checking Paddle…")}
          >
            {null}
          </ActionForm>
          <details className={styles.disclosure}>
            <summary>{t("Switching plans and refunds")}</summary>
            <p className={styles.muted}>
              {t(
                "To switch plans, cancel renewal and subscribe to the other plan after your paid period ends. Refund requests go through Paddle. A full approved refund removes the affected paid access; partial refunds preserve it. Refunding does not automatically cancel renewal.",
              )}
            </p>
          </details>
        </>
      )}
    </div>
  );
}
