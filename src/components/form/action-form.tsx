"use client";

import { type ReactNode, useActionState, useState } from "react";
import {
  type ActionState,
  EMPTY_ACTION_STATE,
} from "@/components/form/utils/to-action-state";
import styles from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";
import { ActionFeedback } from "./action-feedback";

export function ActionForm({
  action,
  label,
  pendingLabel,
  children,
  destructive = false,
  secondary = false,
  icon,
  requireConfirmation = false,
  successDisplay = "toast",
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  label: string;
  pendingLabel: string;
  children: ReactNode;
  destructive?: boolean;
  secondary?: boolean;
  icon?: ReactNode;
  requireConfirmation?: boolean;
  successDisplay?: "inline" | "toast";
}) {
  const t = useText();
  const [confirmation, setConfirmation] = useState<{
    timestamp: number;
    checked: boolean;
  }>({ timestamp: 0, checked: false });
  const [state, submit, pending] = useActionState(action, {
    ...EMPTY_ACTION_STATE,
    timestamp: 0,
  });
  const confirmed =
    confirmation.timestamp === state.timestamp && confirmation.checked;

  return (
    <form action={submit} className={styles.form} aria-busy={pending}>
      <ActionFeedback state={state} successDisplay={successDisplay} />

      <fieldset
        key={requireConfirmation ? state.timestamp : undefined}
        disabled={pending}
        className={styles["form-fields"]}
        onChange={(event) => {
          const input = event.target;
          if (
            requireConfirmation &&
            input instanceof HTMLInputElement &&
            input.name === "confirm" &&
            input.type === "checkbox"
          ) {
            setConfirmation({
              timestamp: state.timestamp,
              checked: input.checked,
            });
          }
        }}
      >
        <legend className={styles["visually-hidden"]}>{label}</legend>
        {children}
        {requireConfirmation && (
          <p className={styles["field-help"]}>
            {t("Check the box above to continue.")}
          </p>
        )}
        <button
          type="submit"
          disabled={requireConfirmation && !confirmed}
          className={
            destructive
              ? styles["danger-button"]
              : secondary
                ? styles["secondary-button"]
                : styles.button
          }
        >
          {icon}
          {pending ? pendingLabel : label}
        </button>
      </fieldset>
    </form>
  );
}
