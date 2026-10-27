"use client";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ActionState } from "@/components/form/utils/to-action-state";
import styles from "@/components/shell.module.css";
import { notifyFormSaved } from "@/i18n/form-changes";
import { useText } from "@/i18n/use-text";
import feedbackStyles from "./feedback.module.css";
import { useSaveConfirmation } from "./feedback-provider";

export function ActionFeedback({
  state,
  successDisplay = "toast",
}: {
  state: ActionState;
  successDisplay?: "inline" | "toast";
}) {
  const t = useText();
  const notify = useSaveConfirmation();
  const message =
    t.feedback(state) || t("Please check the highlighted fields.");

  const feedback = useRef<HTMLDivElement>(null);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const hasErrors = Object.values(state.fieldErrors).some(
    (errors) => errors?.length,
  );

  useEffect(() => {
    if (state.status === "ERROR") {
      feedback.current?.focus();
    } else if (state.status === "SUCCESS") {
      notifyFormSaved(feedback.current);
      if (state.message && successDisplay === "toast")
        notify(
          message,
          feedback.current
            ?.closest("form")
            ?.querySelector<HTMLButtonElement>(
              'button[type="submit"]:not(:disabled)',
            ),
        );
    }
  }, [
    state.status,
    state.timestamp,
    state.message,
    message,
    notify,
    successDisplay,
  ]);

  if (!state.message && !hasErrors) {
    return null;
  }

  if (state.status === "SUCCESS" && successDisplay === "toast") {
    return (
      <>
        <div ref={feedback} hidden />
        <noscript>
          <p role="status" className={feedbackStyles.success}>
            {message}
          </p>
        </noscript>
      </>
    );
  }

  if (state.status === "SUCCESS" && dismissedAt === state.timestamp)
    return <div ref={feedback} hidden />;

  return (
    <div
      ref={feedback}
      tabIndex={-1}
      role={state.status === "ERROR" ? "alert" : "status"}
      className={
        state.status === "ERROR"
          ? `${styles.error} ${feedbackStyles.failure}`
          : feedbackStyles.success
      }
    >
      {state.status === "ERROR" ? (
        <CircleAlert size={21} aria-hidden="true" />
      ) : (
        <CircleCheck size={21} aria-hidden="true" />
      )}
      <span>{message}</span>
      {state.status === "SUCCESS" && (
        <button
          type="button"
          className={feedbackStyles.dismiss}
          aria-label={t("Dismiss confirmation")}
          onClick={() => {
            const target =
              feedback.current
                ?.closest("form")
                ?.querySelector<HTMLButtonElement>(
                  'button[type="submit"]:not(:disabled)',
                ) ?? document.getElementById("main-content");
            target?.focus({ preventScroll: true });
            setDismissedAt(state.timestamp);
          }}
        >
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
