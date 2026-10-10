"use client";

import { RefreshCw } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import shell from "@/components/shell.module.css";
import { useRouter } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import { refreshBilling } from "../actions/manage-billing";
import styles from "./billing.module.css";

export function BillingRefresh({
  pending,
  returned,
  children,
}: {
  pending: boolean;
  returned: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const t = useText();
  const [checking, setChecking] = useState(true);
  const [feedback, setFeedback] = useState({ message: "", error: false });
  const run = useRef<(manual?: boolean) => void>(() => {});

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    let checkedAt = 0;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const check = async (manual = false) => {
      if (disposed || document.visibilityState !== "visible" || inFlight)
        return;
      const remaining = 5000 - (Date.now() - checkedAt);
      if (!manual && remaining > 0) {
        clearTimeout(timer);
        timer = setTimeout(() => void check(), remaining);
        return;
      }
      clearTimeout(timer);
      inFlight = true;
      checkedAt = Date.now();
      setChecking(true);
      let retry = false;
      try {
        const result = await refreshBilling(EMPTY_ACTION_STATE, new FormData());
        if (disposed) return;
        setFeedback({
          message: result.message,
          error: result.status === "ERROR",
        });
        if (result.status === "SUCCESS" || result.status === "PENDING")
          router.refresh();
        retry = result.status === "PENDING";
      } catch {
        if (disposed) return;
        setFeedback({
          message:
            "Billing could not be refreshed. Check your connection and try again.",
          error: true,
        });
      } finally {
        inFlight = false;
      }
      if (disposed) return;
      attempts++;
      if (retry && attempts < 4) {
        timer = setTimeout(() => void check(), 5000);
      } else {
        if (retry)
          setFeedback({
            message:
              "Confirmation is taking longer than expected. Refresh billing shortly. If you already paid, do not start another payment.",
            error: false,
          });
        setChecking(false);
      }
    };

    const start = (manual = false) => {
      attempts = 0;
      void check(manual);
    };
    run.current = start;
    const onReturn = () => start();
    start();
    window.addEventListener("focus", onReturn);
    window.addEventListener("pageshow", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("pageshow", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [router]);

  return (
    <>
      {pending && returned && checking ? (
        <div className={styles.card}>
          <h3>{t("Checking your payment")}</h3>
          <p>
            {t(
              "We’re checking the payment status with Paddle. Your subscription will appear here once payment is confirmed.",
            )}
          </p>
          <p className={styles.meta}>{t("You don’t need to pay again.")}</p>
        </div>
      ) : (
        children
      )}
      <div className={styles.sync}>
        <div className={styles.toolbar}>
          <p className={styles.meta}>
            {t("Changes made in Paddle are checked when you return here.")}
          </p>
          <button
            type="button"
            className={shell["secondary-button"]}
            disabled={checking}
            onClick={() => run.current(true)}
          >
            <RefreshCw size={17} aria-hidden="true" />
            {checking ? t("Checking Paddle…") : t("Refresh billing")}
          </button>
        </div>
        <p
          className={styles.feedback}
          role="status"
          aria-label={t("Billing status")}
          aria-live="polite"
          data-error={feedback.error}
        >
          {checking
            ? t("Checking your latest billing details…")
            : t.message(feedback.message)}
        </p>
      </div>
    </>
  );
}
