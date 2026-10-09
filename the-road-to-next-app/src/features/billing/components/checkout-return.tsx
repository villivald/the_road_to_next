"use client";

import { type ReactNode, useEffect, useState } from "react";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import styles from "@/components/shell.module.css";
import { useRouter } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import { refreshBilling } from "../actions/manage-billing";

export function CheckoutReturn({ children }: { children: ReactNode }) {
  const router = useRouter();
  const t = useText();
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    let canceled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      try {
        const result = await refreshBilling(EMPTY_ACTION_STATE, new FormData());
        if (canceled) return;
        if (result.status === "SUCCESS") router.refresh();
      } catch {
        // The manual refresh remains available if the request cannot complete.
      }
      if (canceled) return;
      attempts++;
      if (attempts < 4) timer = setTimeout(check, 3000);
      else setWaiting(false);
    };

    void check();
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [router]);

  return waiting ? (
    <div className={styles["list-card"]} role="status" aria-live="polite">
      <h3>{t("Checking your payment")}</h3>
      <p>
        {t(
          "We’re checking the payment status with Paddle. Your subscription will appear here once payment is confirmed.",
        )}
      </p>
      <p className={styles.muted}>{t("You don’t need to pay again.")}</p>
    </div>
  ) : (
    <>
      <p className={styles.notice} role="status">
        {t(
          "Payment confirmation is taking longer than expected. Refresh billing shortly. Resume checkout only if you did not finish paying.",
        )}
      </p>
      {children}
    </>
  );
}
