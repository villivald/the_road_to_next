"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/form/action-feedback";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import styles from "@/components/shell.module.css";
import { removeAccount } from "../actions/manage-account";

export function DeleteAccountForm({ impactToken }: { impactToken: string }) {
  const [state, action, pending] = useActionState(removeAccount, {
    ...EMPTY_ACTION_STATE,
    timestamp: 0,
  });

  return (
    <form action={action} className={styles.form} aria-busy={pending}>
      <ActionFeedback state={state} />
      <input type="hidden" name="impactToken" value={impactToken} />
      <fieldset className={styles["form-fields"]} disabled={pending}>
        <legend className={styles["visually-hidden"]}>
          Confirm account deletion
        </legend>
        <div className={styles.field}>
          <label htmlFor="delete-password">Current password</label>
          <input
            key={state.timestamp}
            id="delete-password"
            type="password"
            name="password"
            autoComplete="current-password"
            maxLength={128}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="delete-confirmation">Type DELETE to confirm</label>
          <input
            id="delete-confirmation"
            name="confirmation"
            autoComplete="off"
            spellCheck={false}
            pattern="DELETE"
            required
          />
        </div>
        <button type="submit" className={styles["danger-button"]}>
          {pending ? "Deleting…" : "Permanently delete account"}
        </button>
      </fieldset>
    </form>
  );
}
