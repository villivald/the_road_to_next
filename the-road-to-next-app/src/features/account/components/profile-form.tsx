"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/form/action-feedback";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import styles from "@/components/shell.module.css";
import { saveProfile } from "../actions/manage-account";

export function ProfileForm({
  profile,
}: {
  profile: { name: string | null; description: string | null };
}) {
  const [state, action, pending] = useActionState(saveProfile, {
    ...EMPTY_ACTION_STATE,
    timestamp: 0,
  });

  return (
    <form action={action} className={styles.form} aria-busy={pending}>
      <ActionFeedback state={state} />
      <fieldset className={styles["form-fields"]} disabled={pending}>
        <legend className={styles["visually-hidden"]}>Profile details</legend>
        <div className={styles.field}>
          <label htmlFor="profile-name">Display name</label>
          <input
            key={state.timestamp}
            id="profile-name"
            name="name"
            autoComplete="name"
            maxLength={80}
            defaultValue={String(
              state.payload?.get("name") ?? profile.name ?? "",
            )}
            aria-invalid={!!state.fieldErrors.name?.length}
            aria-describedby={
              state.fieldErrors.name?.length ? "profile-name-error" : undefined
            }
          />
          {state.fieldErrors.name && (
            <p id="profile-name-error" className={styles["error-text"]}>
              {state.fieldErrors.name.join(" ")}
            </p>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor="profile-description">About you</label>
          <textarea
            key={state.timestamp}
            id="profile-description"
            name="description"
            rows={4}
            maxLength={1000}
            defaultValue={String(
              state.payload?.get("description") ?? profile.description ?? "",
            )}
            aria-invalid={!!state.fieldErrors.description?.length}
            aria-describedby={
              state.fieldErrors.description?.length
                ? "profile-description-error"
                : undefined
            }
          />
          {state.fieldErrors.description && (
            <p id="profile-description-error" className={styles["error-text"]}>
              {state.fieldErrors.description.join(" ")}
            </p>
          )}
        </div>
        <p className={styles.muted}>
          These optional profile details and your avatar are currently visible
          only to you.
        </p>
        <button type="submit" className={styles.button}>
          {pending ? "Saving…" : "Save profile"}
        </button>
      </fieldset>
    </form>
  );
}
