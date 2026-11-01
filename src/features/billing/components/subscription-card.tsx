import {
  CalendarOff,
  CircleAlert,
  CircleCheck,
  Clock3,
  CreditCard,
  ExternalLink,
  PauseCircle,
} from "lucide-react";
import { ActionForm } from "@/components/form/action-form";
import { LocalTime } from "@/components/local-time";
import shell from "@/components/shell.module.css";
import { getText } from "@/i18n/server";
import {
  manageSubscription,
  restartSubscription,
} from "../actions/manage-billing";
import { plans } from "../service/config";
import type { BillingOverview } from "../service/overview";
import styles from "./billing.module.css";

type Subscription = BillingOverview["subscriptions"][number];

export async function SubscriptionCard({
  subscription,
  enabled,
  checkoutEnabled,
}: {
  subscription: Subscription;
  enabled: boolean;
  checkoutEnabled: boolean;
}) {
  const t = await getText();
  const canceled = subscription.status === "canceled";
  const ending = !!subscription.cancelAt && !canceled;
  const overdue = subscription.status === "past_due";
  const paused = subscription.status === "paused";
  const active = subscription.status === "active" && !ending;
  const refunded = subscription.payments.some((payment) => payment.refunded);
  const paidUntil = subscription.payments
    .filter((payment) => !payment.refunded)
    .reduce<Date | null>(
      (end, payment) =>
        !end || payment.expiresAt > end ? payment.expiresAt : end,
      null,
    );
  const StatusIcon = overdue
    ? CircleAlert
    : ending || canceled
      ? CalendarOff
      : paused
        ? PauseCircle
        : active
          ? CircleCheck
          : Clock3;
  const status = overdue
    ? t("Payment overdue")
    : ending
      ? t("Renewal canceled")
      : ({
          active: t("Auto-renewal on"),
          canceled: t("Canceled subscription"),
          paused: t("Paused subscription"),
          trialing: t("Trialing subscription"),
        }[subscription.status] ?? t("Subscription status unavailable"));

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3>
            {subscription.interval === "year"
              ? t("Annual subscription")
              : t("Monthly subscription")}
          </h3>
          {!canceled && (
            <p className={styles.meta}>
              {t.message(
                plans[subscription.interval === "year" ? "year" : "month"]
                  .display,
              )}
            </p>
          )}
        </div>
        <p
          className={styles.status}
          data-tone={overdue ? "attention" : active ? "positive" : "neutral"}
        >
          <StatusIcon size={18} aria-hidden="true" />
          {status}
        </p>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>{t("Renewal")}</dt>
          <dd>
            {ending || canceled
              ? t("Will not renew")
              : paused
                ? t("Paused subscription")
                : ["active", "past_due", "trialing"].includes(
                      subscription.status,
                    )
                  ? t("Renews automatically")
                  : t("Subscription status unavailable")}
          </dd>
        </div>
        {ending ? (
          <div>
            <dt>
              {paidUntil
                ? t("Subscription ends on")
                : t("Cancellation takes effect on")}
            </dt>
            <dd>
              <LocalTime
                value={subscription.cancelAt!.toISOString()}
                dateOnly
              />
            </dd>
          </div>
        ) : !canceled && !paused && subscription.nextBilledAt ? (
          <div>
            <dt>{t("Next payment:")}</dt>
            <dd>
              <LocalTime
                value={subscription.nextBilledAt.toISOString()}
                dateOnly
              />
            </dd>
          </div>
        ) : null}
        {paidUntil && !ending && (canceled || paused || overdue) && (
          <div>
            <dt>{t("Paid access until")}</dt>
            <dd>
              <LocalTime value={paidUntil.toISOString()} dateOnly />
            </dd>
          </div>
        )}
      </dl>
      {ending && (
        <p>
          {paidUntil
            ? t(
                "This subscription will not renew. Your remaining paid access stays available.",
              )
            : t(
                "This subscription will not renew. No paid access remains from this subscription.",
              )}
        </p>
      )}
      {canceled && (
        <p>
          {paidUntil
            ? t(
                "Renewal has stopped. Any remaining paid time stays available until it expires.",
              )
            : t(
                "Renewal has stopped. No paid access remains from this subscription.",
              )}
        </p>
      )}
      {paused && (
        <p>
          {t(
            "Payments are paused. Your access depends on your remaining paid time and promo codes.",
          )}
        </p>
      )}
      {overdue && (
        <p className={styles.message} data-tone="attention">
          <CircleAlert size={18} aria-hidden="true" />
          {t(
            "Paddle could not collect a payment. Update your payment method in Paddle. Premium continues only for confirmed paid time or promo access.",
          )}
        </p>
      )}
      {refunded && (
        <p className={styles.message}>
          <CircleCheck size={18} aria-hidden="true" />
          <span>
            {t(
              "A payment was fully refunded. Access from that payment was removed.",
            )}
            {!ending && !canceled && (
              <>
                {" "}
                {t(
                  "A refund does not cancel automatic renewal. You can manage renewal in Paddle.",
                )}
              </>
            )}
          </span>
        </p>
      )}
      <div className={styles.actions}>
        {enabled && (
          <ActionForm
            action={manageSubscription.bind(null, subscription.id)}
            label={t("Manage subscription")}
            pendingLabel={t("Opening Paddle…")}
            secondary
            icon={<ExternalLink size={17} aria-hidden="true" />}
          >
            {null}
          </ActionForm>
        )}
        <a href="https://paddle.net/" className={shell["secondary-button"]}>
          <ExternalLink size={17} aria-hidden="true" />
          {t("Request a refund")}
        </a>
      </div>
      {checkoutEnabled && ending && refunded && !paidUntil && (
        <section
          className={styles.sync}
          aria-labelledby={`restart-${subscription.id}`}
        >
          <h4 id={`restart-${subscription.id}`}>{t("Subscribe again")}</h4>
          <p>
            {t(
              "End this refunded subscription now, then choose a new plan. A new payment requires a separate checkout confirmation.",
            )}
          </p>
          <ActionForm
            action={restartSubscription.bind(null, subscription.id)}
            label={t("Start a new subscription")}
            pendingLabel={t("Preparing plan choices…")}
            secondary
            requireConfirmation
          >
            <label className={shell["checkbox-label"]}>
              <input name="confirm" type="checkbox" value="yes" required />
              {t(
                "I want to end this refunded subscription immediately and choose a new plan.",
              )}
            </label>
          </ActionForm>
        </section>
      )}
      <p className={`${styles.meta} ${styles.fact}`}>
        <CreditCard size={16} aria-hidden="true" />
        {t(
          "Use Manage subscription for payment methods, receipts and renewal settings. Refund requests go to Paddle Buyer Support.",
        )}
      </p>
    </article>
  );
}
