"use client";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ActionState } from "@/components/form/utils/to-action-state";
import styles from "@/components/shell.module.css";
import { notifyFormSaved } from "@/i18n/form-changes";
import { useText } from "@/i18n/use-text";
import feedbackStyles from "./feedback.module.css";
import { useSaveConfirmation } from "./feedback-provider";

export function ActionFeedback({ state }: { state: ActionState }) {
  const t = useText();
  const notify = useSaveConfirmation();
  const message =
    t.feedback(state) || t("Please check the highlighted fields.");

  const feedback = useRef<HTMLDivElement>(null);
  const hasErrors = Object.values(state.fieldErrors).some(
    (errors) => errors?.length,
  );

  useEffect(() => {
    if (state.status === "ERROR") {
      feedback.current?.focus();
    } else if (state.status === "SUCCESS") {
      notifyFormSaved(feedback.current);
      if (state.message) notify(message);
    }
  }, [state.status, state.timestamp, state.message, message, notify]);

  if (!state.message && !hasErrors) {
    return null;
  }

  return (
    <div
      ref={feedback}
      tabIndex={-1}
      role={state.status === "ERROR" ? "alert" : "status"}
      aria-live={state.status === "SUCCESS" ? "off" : undefined}
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
    </div>
  );
}
