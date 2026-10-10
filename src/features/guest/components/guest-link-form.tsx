"use client";
import { Copy, Link2 } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { ActionFeedback } from "@/components/form/action-feedback";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import styles from "@/components/shell.module.css";
import sharingStyles from "@/features/sharing/components/sharing.module.css";
import { useText } from "@/i18n/use-text";
import { createLink } from "../actions/manage-links";

function CopyLink({ url }: { url: string }) {
  const t = useText();

  const [message, setMessage] = useState("");
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  return (
    <section
      className={sharingStyles.generated}
      aria-labelledby={`${id}-heading`}
    >
      <h3 id={`${id}-heading`}>{t("Ready to share")}</h3>
      <p className={styles.muted}>
        {t(
          "Copy this link before leaving the page. You cannot retrieve it later.",
        )}
      </p>
      <div className={styles.field}>
        <label htmlFor={id}>{t("New guest link")}</label>
        <input
          id={id}
          ref={input}
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          autoComplete="off"
        />
      </div>
      <button
        type="button"
        className={styles.button}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setMessage("Link copied.");
          } catch {
            setMessage("Select the link above and copy it manually.");
          }
        }}
      >
        <Copy size={18} aria-hidden="true" />
        {t("Copy guest link")}
      </button>
      {message && <p role="status">{t.message(message)}</p>}
    </section>
  );
}

export function GuestLinkForm({ listId }: { listId: string }) {
  const t = useText();

  const [state, action, pending] = useActionState(
    createLink.bind(null, listId),
    { ...EMPTY_ACTION_STATE, timestamp: 0 },
  );
  const id = useId();
  const url = (state.data as { url?: string } | undefined)?.url;
  const form = (
    <form action={action} aria-busy={pending} className={styles.form}>
      <fieldset
        key={state.timestamp}
        disabled={pending}
        className={styles["form-fields"]}
      >
        <legend className={styles["visually-hidden"]}>
          {t("Create a guest link")}
        </legend>
        <div className={styles["form-row"]}>
          <div className={styles.field}>
            <label htmlFor={`${id}-label`}>{t("Link label")}</label>
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
              {state.fieldErrors.label?.map(t.message).join(" ") ??
                t(
                  "For your reference only, such as Family or Birthday guests.",
                )}
            </p>
          </div>
          <div className={styles.field}>
            <label htmlFor={`${id}-days`}>{t("Expires after")}</label>
            <select
              id={`${id}-days`}
              name="days"
              defaultValue={String(state.payload?.get("days") ?? "7")}
            >
              <option value="1">{t("1 day")}</option>
              <option value="7">{t("7 days")}</option>
              <option value="30">{t("30 days")}</option>
            </select>
          </div>
        </div>
        <label className={styles["checkbox-label"]}>
          <input type="checkbox" name="confirm" value="yes" required />
          {t(
            "Anyone with this link can view available wishes while the list is visible, until the link expires or is disabled.",
          )}
        </label>
        <button type="submit" className={styles.button}>
          <Link2 size={18} aria-hidden="true" />
          {pending ? t("Creating…") : t("Create guest link")}
        </button>
      </fieldset>
    </form>
  );

  return (
    <div className={styles.form}>
      <ActionFeedback state={state} />
      {url ? (
        <>
          <CopyLink key={url} url={url} />
          <details className={styles.disclosure}>
            <summary>{t("Create another link")}</summary>
            {form}
          </details>
        </>
      ) : (
        form
      )}
    </div>
  );
}
