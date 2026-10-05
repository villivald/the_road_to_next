"use client";

import { useActionState, useId, useState } from "react";
import { ActionFeedback } from "@/components/form/action-feedback";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import styles from "@/components/shell.module.css";
import { createLink } from "../actions/manage-links";

function CopyLink({ url }: { url: string }) {
  const [message, setMessage] = useState("");
  const id = useId();
  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label htmlFor={id}>New guest link</label>
        <input
          id={id}
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          autoComplete="off"
        />
      </div>
      <button
        type="button"
        className={styles["secondary-button"]}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setMessage("Link copied.");
          } catch {
            setMessage("Select the link above and copy it manually.");
          }
        }}
      >
        Copy guest link
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}

export function GuestLinkForm({ listId }: { listId: string }) {
  const [state, action, pending] = useActionState(
    createLink.bind(null, listId),
    { ...EMPTY_ACTION_STATE, timestamp: 0 },
  );
  const id = useId();
  const url = (state.data as { url?: string } | undefined)?.url;
  return (
    <div className={styles.form}>
      <form action={action} aria-busy={pending} className={styles.form}>
        <ActionFeedback state={state} />
        <fieldset
          key={state.timestamp}
          disabled={pending}
          className={styles["form-fields"]}
        >
          <legend className={styles["visually-hidden"]}>
            Create a guest link
          </legend>
          <div className={styles.field}>
            <label htmlFor={`${id}-label`}>Link label</label>
            <input
              id={`${id}-label`}
              name="label"
              required
              maxLength={80}
              defaultValue={String(state.payload?.get("label") ?? "")}
              aria-invalid={!!state.fieldErrors.label?.length}
              aria-describedby={`${id}-help`}
            />
            <p id={`${id}-help`} className={styles.muted}>
              {state.fieldErrors.label?.join(" ") ??
                "For your reference only, such as Family or Birthday guests."}
            </p>
          </div>
          <div className={styles.field}>
            <label htmlFor={`${id}-days`}>Expires after</label>
            <select
              id={`${id}-days`}
              name="days"
              defaultValue={String(state.payload?.get("days") ?? "7")}
            >
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
            </select>
          </div>
          <label className={styles["checkbox-label"]}>
            <input type="checkbox" name="confirm" value="yes" required />
            Anyone with this link can view the published list and its available
            wishes until it expires or is revoked.
          </label>
          <button type="submit" className={styles.button}>
            {pending ? "Creating…" : "Create guest link"}
          </button>
        </fieldset>
      </form>
      {url && !pending && <CopyLink key={url} url={url} />}
    </div>
  );
}
