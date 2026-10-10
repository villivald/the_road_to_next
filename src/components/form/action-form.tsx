"use client";

import { type ReactNode, useActionState } from "react";
import {
  type ActionState,
  EMPTY_ACTION_STATE,
} from "@/components/form/utils/to-action-state";
import styles from "@/components/shell.module.css";
import { ActionFeedback } from "./action-feedback";

export function ActionForm({
  action,
  label,
  pendingLabel,
  children,
  destructive = false,
  secondary = false,
  icon,
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  label: string;
  pendingLabel: string;
  children: ReactNode;
  destructive?: boolean;
  secondary?: boolean;
  icon?: ReactNode;
}) {
  const [state, submit, pending] = useActionState(action, {
    ...EMPTY_ACTION_STATE,
    timestamp: 0,
  });

  return (
    <form action={submit} className={styles.form} aria-busy={pending}>
      <ActionFeedback state={state} />

      <fieldset disabled={pending} className={styles["form-fields"]}>
        <legend className={styles["visually-hidden"]}>{label}</legend>
        {children}
        <button
          type="submit"
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
