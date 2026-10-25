"use client";
import { useActionState } from "react";
import { ActionFeedback } from "@/components/form/action-feedback";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import styles from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";
import { redeemPromoCode } from "../actions/redeem-promo";
import formStyles from "./promo-form.module.css";

export function PromoForm() {
  const t = useText();

  const [state, action, pending] = useActionState(redeemPromoCode, {
    ...EMPTY_ACTION_STATE,
    timestamp: 0,
  });

  return (
    <form action={action} className={formStyles.form} aria-busy={pending}>
      <ActionFeedback state={state} />
      <fieldset disabled={pending} className={formStyles.fields}>
        <legend className={styles["visually-hidden"]}>
          {t("Redeem a promo code")}
        </legend>
        <label htmlFor="promo-code">{t("Promo code")}</label>
        <div className={formStyles.controls}>
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
          <button type="submit" className={styles.button}>
            {pending ? t("Redeeming…") : t("Redeem code")}
          </button>
        </div>
        <p id="promo-help" className={formStyles.help}>
          {t(
            "Each code can be used once. It adds Premium time without starting a subscription.",
          )}
        </p>
        <details className={styles.disclosure}>
          <summary>{t("How promo time works")}</summary>
          <p className={formStyles.help}>
            {t(
              "Promo time extends your current Premium access, or starts today on Free. Existing subscription payment dates do not change.",
            )}
          </p>
        </details>
      </fieldset>
    </form>
  );
}
