import Link from "next/link";
import { ActionForm } from "@/components/form/action-form";
import styles from "@/components/shell.module.css";
import { prisma } from "@/lib/prisma";
import {
  abandonCheckout,
  manageSubscription,
  refreshBilling,
  subscribe,
} from "../actions/manage-billing";
import { billingEnabled, type BillingInterval, plans } from "../service/config";

export async function BillingPanel({ userId }: { userId: string }) {
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

  return (
    <div className={styles.form}>
      <h2>Subscription</h2>
      {!billingEnabled() ? (
        <p>
          Subscriptions are not configured yet. You can still use a promo code.
        </p>
      ) : (
        <>
          <p className={styles.notice}>
            Sandbox billing · Test payments only. No real money is charged.
          </p>
          <p>
            Subscriptions renew automatically. Cancel in Paddle to stop renewal
            at the end of the paid period. Failed renewals do not add unpaid
            access. Promo access remains independent and does not delay
            subscription charges.
          </p>
          {account?.subscriptions.map((subscription) => (
            <div className={styles["list-card"]} key={subscription.id}>
              <h3>
                {subscription.interval === "year" ? "Annual" : "Monthly"}{" "}
                subscription
              </h3>
              <p>Status: {subscription.status.replaceAll("_", " ")}</p>
              {subscription.cancelAt ? (
                <p>
                  Cancellation scheduled for{" "}
                  {subscription.cancelAt.toLocaleDateString("en-GB", {
                    timeZone: "UTC",
                  })}
                  .
                </p>
              ) : subscription.nextBilledAt ? (
                <p>
                  Next payment:{" "}
                  {subscription.nextBilledAt.toLocaleDateString("en-GB", {
                    timeZone: "UTC",
                  })}
                  .
                </p>
              ) : null}
              <ActionForm
                action={manageSubscription.bind(null, subscription.id)}
                label="Manage subscription"
                pendingLabel="Opening Paddle…"
              >
                <p>
                  View payments, update your payment method, or cancel in
                  Paddle.
                </p>
              </ActionForm>
            </div>
          ))}
          {pending ? (
            <div className={styles["list-card"]}>
              <h3>Unfinished checkout</h3>
              <p>
                {pending.cancelRequested
                  ? "Closing checkout. Refresh billing to check the result."
                  : "Resume your existing checkout, or discard it before selecting another plan."}
              </p>
              {pending.transactionId && !pending.cancelRequested && (
                <Link href={`/account/checkout?id=${pending.id}`}>
                  Resume checkout
                </Link>
              )}
              {!pending.cancelRequested && (
                <ActionForm
                  action={abandonCheckout}
                  label="Discard checkout"
                  pendingLabel="Closing…"
                >
                  {null}
                </ActionForm>
              )}
              {!pending.transactionId && (
                <p>
                  We are checking whether Paddle created your checkout. If this
                  persists, contact the app administrator; another payment will
                  not be started automatically.
                </p>
              )}
            </div>
          ) : !active && !paid ? (
            <div className={styles["list-grid"]}>
              {(Object.keys(plans) as BillingInterval[]).map((interval) => (
                <div className={styles["list-card"]} key={interval}>
                  <h3>{plans[interval].display}</h3>
                  <p>
                    Includes applicable tax. Premium starts after payment
                    confirmation.
                  </p>
                  <ActionForm
                    action={subscribe.bind(null, interval)}
                    label={`Choose ${plans[interval].label.toLowerCase()}`}
                    pendingLabel="Preparing checkout…"
                  >
                    <label className={styles["checkbox-label"]}>
                      <input
                        name="confirm"
                        type="checkbox"
                        value="yes"
                        required
                      />
                      I agree to automatic{" "}
                      {interval === "month" ? "monthly" : "annual"} renewal at{" "}
                      {plans[interval].display} until canceled.
                    </label>
                  </ActionForm>
                </div>
              ))}
            </div>
          ) : !active ? (
            <p>
              Your paid period is still active. You can choose another plan
              after it ends.
            </p>
          ) : null}
          <ActionForm
            action={refreshBilling}
            label="Refresh billing"
            pendingLabel="Checking Paddle…"
          >
            {null}
          </ActionForm>
          <p className={styles.muted}>
            To switch plans, cancel renewal and subscribe to the other plan
            after your paid period ends. Refund requests go through Paddle. A
            full approved refund removes the affected paid access; partial
            refunds preserve it. Refunding does not automatically cancel
            renewal.
          </p>
        </>
      )}
    </div>
  );
}
