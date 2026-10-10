import {
  Check,
  CircleCheck,
  Clock3,
  CreditCard,
  FlaskConical,
  X,
} from "lucide-react";
import { ActionForm } from "@/components/form/action-form";
import { LocalTime } from "@/components/local-time";
import shell from "@/components/shell.module.css";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import { abandonCheckout, subscribe } from "../actions/manage-billing";
import { billingEnabled, type BillingInterval, plans } from "../service/config";
import type { BillingOverview } from "../service/overview";
import styles from "./billing.module.css";
import { BillingRefresh } from "./billing-refresh";
import { SubscriptionCard } from "./subscription-card";

export async function BillingPanel({
  overview,
  returned = false,
}: {
  overview: BillingOverview;
  returned?: boolean;
}) {
  const t = await getText();
  const { account, pending, subscriptions, active, paidUntil, hasPromo } =
    overview;
  const enabled = billingEnabled();
  const confirmedCheckout = subscriptions.some((subscription) =>
    subscription.payments.some(
      (payment) =>
        payment.id === account?.checkouts[0]?.transactionId &&
        !payment.refunded,
    ),
  );
  const current = subscriptions.filter(
    (subscription) => subscription.status !== "canceled",
  );
  const previous = subscriptions.filter(
    (subscription) => subscription.status === "canceled",
  );
  const pendingCard = pending && (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3>
          {pending.cancelRequested
            ? t("Closing checkout")
            : returned
              ? t("Payment not confirmed yet")
              : t("Continue your checkout")}
        </h3>
        <span className={styles.status}>
          <Clock3 size={17} aria-hidden="true" />
          {t("Awaiting confirmation")}
        </span>
      </div>
      <p>
        {pending.cancelRequested
          ? t(
              "We’re checking whether this checkout can be closed. A payment already processing may still complete.",
            )
          : t(
              "If you already paid, refresh billing to check the result. Otherwise, you can continue the same checkout.",
            )}
      </p>
      <div className={styles.actions}>
        {pending.transactionId && !pending.cancelRequested && (
          <Link
            className={shell.button}
            href={`/account/checkout?id=${pending.id}`}
          >
            <CreditCard size={18} aria-hidden="true" />
            {t("Resume checkout")}
          </Link>
        )}
        {!pending.cancelRequested && (
          <ActionForm
            action={abandonCheckout}
            label={t("Discard checkout")}
            pendingLabel={t("Closing…")}
            secondary
            icon={<X size={17} aria-hidden="true" />}
          >
            {null}
          </ActionForm>
        )}
      </div>
      <p className={styles.meta}>
        {t(
          "Closing an unpaid checkout lets you choose another plan. It does not cancel an existing subscription.",
        )}
      </p>
      {!pending.transactionId && (
        <p>
          {t(
            "Checkout is still being prepared. Refresh billing shortly before trying again.",
          )}
        </p>
      )}
    </div>
  );

  return (
    <section className={styles.section} aria-labelledby="subscription-heading">
      <h2 id="subscription-heading">{t("Subscription")}</h2>
      {enabled ? (
        <p className={styles.sandbox}>
          <FlaskConical size={18} aria-hidden="true" />
          {t("Sandbox billing · Test payments only. No real money is charged.")}
        </p>
      ) : (
        <p>
          {t(
            "Subscriptions are not available yet. You can still use a promo code.",
          )}
        </p>
      )}
      {returned && !pending && confirmedCheckout && (
        <p className={styles.message} data-tone="positive" role="status">
          <CircleCheck size={18} aria-hidden="true" />
          {t("Payment confirmed. Your Premium access is ready.")}
        </p>
      )}
      {current.map((subscription) => (
        <SubscriptionCard
          key={subscription.id}
          subscription={subscription}
          enabled={enabled}
        />
      ))}
      {!current.length && previous[0] && (
        <SubscriptionCard subscription={previous[0]} enabled={enabled} />
      )}
      {previous.length > (current.length ? 0 : 1) && (
        <details className={shell.disclosure}>
          <summary>{t("Previous subscriptions")}</summary>
          <div className={styles.section}>
            {previous.slice(current.length ? 0 : 1).map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                enabled={enabled}
              />
            ))}
          </div>
        </details>
      )}
      {enabled && !pending && !active && !paidUntil && (
        <>
          <p>
            {t(
              "Choose how often to pay. Both options include all Premium features.",
            )}
          </p>
          {hasPromo && (
            <p className={styles.message}>
              {t(
                "Your promo access is already active or scheduled. Subscribing starts billing now; promo days do not postpone subscription payments.",
              )}
            </p>
          )}
          <div className={styles.offers}>
            {(Object.keys(plans) as BillingInterval[]).map((interval) => (
              <article
                className={`${styles.card} ${styles.offer}`}
                key={interval}
              >
                <h3>{t(plans[interval].label)}</h3>
                <p className={styles.price}>
                  {t.message(plans[interval].display)}
                </p>
                <p className={styles.meta}>
                  {interval === "year"
                    ? t("Save €9 a year compared with monthly billing.")
                    : t("Pay monthly, with no annual commitment.")}
                </p>
                <p className={styles.fact}>
                  <Check size={17} aria-hidden="true" />
                  {t("All Premium features. Cancel renewal at any time.")}
                </p>
                <ActionForm
                  action={subscribe.bind(null, interval)}
                  label={t("Choose {value0}", {
                    value0: t(plans[interval].label).toLowerCase(),
                  })}
                  pendingLabel={t("Preparing checkout…")}
                >
                  <label className={shell["checkbox-label"]}>
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
              </article>
            ))}
          </div>
          <p className={styles.meta}>
            {t(
              "Prices include applicable tax. Payment is handled securely by Paddle. Premium starts after payment confirmation.",
            )}
          </p>
        </>
      )}
      {!pending && !active && paidUntil && (
        <p className={styles.message}>
          <span>
            {t("Your paid access continues until")}{" "}
            <LocalTime value={paidUntil.toISOString()} dateOnly />.{" "}
            {t("You can choose another plan after that date.")}
          </span>
        </p>
      )}
      {enabled && account && (
        <BillingRefresh pending={!!pending} returned={returned}>
          {pendingCard}
        </BillingRefresh>
      )}
    </section>
  );
}
