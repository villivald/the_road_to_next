"use client";
import { useActionState } from "react";
import { ActionFeedback } from "@/components/form/action-feedback";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import styles from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";
import { redeemPromoCode } from "../actions/redeem-promo";

export function PromoForm() {
  const t = useText();

  const [state, action, pending] = useActionState(redeemPromoCode, {
    ...EMPTY_ACTION_STATE,
    timestamp: 0,
  });

  return (
    <form action={action} className={styles.form} aria-busy={pending}>
      <ActionFeedback state={state} />
      <fieldset disabled={pending} className={styles["form-fields"]}>
        <legend className={styles["visually-hidden"]}>
          {t("Redeem a promo code")}
        </legend>
        <div className={styles.field}>
          <label htmlFor="promo-code">{t("Promo code")}</label>
          <input
            key={state.timestamp}
            id="promo-code"
            name="code"
            maxLength={96}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
            aria-describedby="promo-help"
          />
          <p id="promo-help" className={styles.muted}>
            {t(
              "Use each code once per account. Promo days extend your current Premium access, or start today on Free. Subscription payments keep their original schedule.",
            )}
          </p>
        </div>
        <button type="submit" className={styles.button}>
          {pending ? t("Redeeming…") : t("Redeem code")}
        </button>
      </fieldset>
    </form>
  );
}
