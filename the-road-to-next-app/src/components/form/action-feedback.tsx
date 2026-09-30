"use client";

import { useEffect, useRef } from "react";
import type { ActionState } from "@/components/form/utils/to-action-state";
import styles from "@/components/shell.module.css";

export function ActionFeedback({ state }: { state: ActionState }) {
  const feedback = useRef<HTMLDivElement>(null);
  const hasErrors = Object.values(state.fieldErrors).some(
    (errors) => errors?.length,
  );

  useEffect(() => {
    if (state.status === "ERROR") {
      feedback.current?.focus();
    }
  }, [state.status, state.timestamp]);

  if (!state.message && !hasErrors) {
    return null;
  }

  return (
    <div
      ref={feedback}
      tabIndex={-1}
      role={state.status === "ERROR" ? "alert" : "status"}
      className={state.status === "ERROR" ? styles.error : styles.notice}
    >
      {state.message || "Please check the highlighted fields."}
    </div>
  );
}
