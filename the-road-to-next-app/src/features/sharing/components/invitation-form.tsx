"use client";
import { Mail } from "lucide-react";
import { useActionState, useId } from "react";
import { ActionFeedback } from "@/components/form/action-feedback";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import styles from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";
import { sendInvitation } from "../actions/manage-sharing";

export function InvitationForm({ listId }: { listId: string }) {
  const t = useText();

  const [state, action, pending] = useActionState(
    sendInvitation.bind(null, listId),
    { ...EMPTY_ACTION_STATE, timestamp: 0 },
  );
  const id = useId();
  return (
    <form action={action} className={styles.form} aria-busy={pending}>
      <ActionFeedback state={state} />
      <fieldset
        key={state.timestamp}
        disabled={pending}
        className={styles["form-fields"]}
      >
        <legend className={styles["visually-hidden"]}>
          {t("Invite someone")}
        </legend>
        <div className={styles.field}>
          <label htmlFor={`${id}-email`}>{t("Invitation email")}</label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="off"
            required
            maxLength={254}
            defaultValue={String(state.payload?.get("email") ?? "")}
            aria-invalid={!!state.fieldErrors.email?.length}
            aria-describedby={`${id}-email-help`}
          />
          <p id={`${id}-email-help`} className={styles.muted}>
            {state.fieldErrors.email?.map(t.message).join(" ") ??
              t("They will need to verify this email before joining.")}
          </p>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-role`}>{t("Invitation role")}</label>
          <select
            id={`${id}-role`}
            name="role"
            defaultValue={String(state.payload?.get("role") ?? "MEMBER")}
          >
            <option value="MEMBER">{t("Member — view and reserve")}</option>
            <option value="ADMIN">
              {t("Admin — edit and manage sharing")}
            </option>
          </select>
        </div>
        <button className={styles.button} type="submit">
          <Mail size={18} aria-hidden="true" />
          {pending ? t("Inviting…") : t("Send invitation")}
        </button>
      </fieldset>
    </form>
  );
}
