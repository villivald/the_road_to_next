"use client";
import { Check, Mail, Star } from "lucide-react";
import { useActionState, useId, useRef, useState } from "react";
import { ActionFeedback } from "@/components/form/action-feedback";
import type { ActionState } from "@/components/form/utils/to-action-state";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import styles from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";
import { sendInvitation } from "../actions/manage-sharing";
import sharingStyles from "./sharing.module.css";

type Recipient = { email: string; username: string };
type Favorite = { id: string; name: string | null; username: string };
type Suggestions = { favorites: Favorite[]; previousRecipients: Recipient[] };

export function InvitationForm({
  listId,
  favorites = [],
  previousRecipients = [],
}: { listId: string } & Partial<Suggestions>) {
  const [state, action, pending] = useActionState(
    sendInvitation.bind(null, listId),
    { ...EMPTY_ACTION_STATE, timestamp: 0 },
  );
  const id = useId();
  return (
    <form action={action} className={styles.form} aria-busy={pending}>
      <ActionFeedback state={state} />
      <InvitationFields
        key={state.timestamp}
        state={state}
        pending={pending}
        id={id}
        favorites={favorites}
        previousRecipients={previousRecipients}
      />
    </form>
  );
}

function InvitationFields({
  state,
  pending,
  id,
  favorites,
  previousRecipients,
}: {
  state: ActionState;
  pending: boolean;
  id: string;
} & Suggestions) {
  const t = useText();
  const [email, setEmail] = useState(String(state.payload?.get("email") ?? ""));
  const [recipientId, setRecipientId] = useState(
    String(state.payload?.get("recipientId") ?? ""),
  );
  const selected = favorites.find((person) => person.id === recipientId);
  const emailInput = useRef<HTMLInputElement>(null);
  return (
    <fieldset
      disabled={pending}
      className={`${styles["form-fields"]} ${sharingStyles["invitation-fields"]}`}
    >
      <legend className={styles["visually-hidden"]}>
        {t("Invite people")}
      </legend>
      {favorites.length > 0 && (
        <div className={sharingStyles.suggestions}>
          <p id={`${id}-favorites`}>
            <Star size={18} aria-hidden="true" /> {t("From your favorites")}
          </p>
          <div role="group" aria-labelledby={`${id}-favorites`}>
            {favorites.map((person) => (
              <button
                key={person.id}
                type="button"
                aria-pressed={selected?.id === person.id}
                className={sharingStyles.recipient}
                onClick={() => {
                  setRecipientId(selected?.id === person.id ? "" : person.id);
                  setEmail("");
                }}
              >
                <span className={sharingStyles.avatar} aria-hidden="true">
                  {(person.name ?? person.username)
                    .slice(0, 1)
                    .toLocaleUpperCase(t.locale)}
                </span>
                <span className={sharingStyles["recipient-identity"]}>
                  <strong>{person.name ?? person.username}</strong>
                  <span>@{person.username}</span>
                </span>
                {selected?.id === person.id && (
                  <Check size={18} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
          <p className={styles["field-help"]}>
            {t(
              "Choose a person, then send an invitation. Their email address stays private.",
            )}
          </p>
        </div>
      )}
      {previousRecipients.length > 0 && (
        <div className={sharingStyles.suggestions}>
          <p id={`${id}-suggestions`}>{t("Previously invited by you")}</p>
          <div role="group" aria-labelledby={`${id}-suggestions`}>
            {previousRecipients.map((recipient) => (
              <button
                key={recipient.email}
                type="button"
                aria-pressed={!selected && email === recipient.email}
                className={sharingStyles.recipient}
                onClick={() => {
                  setRecipientId("");
                  setEmail(recipient.email);
                  emailInput.current?.focus();
                }}
              >
                <span className={sharingStyles.avatar} aria-hidden="true">
                  {recipient.username.slice(0, 1).toLocaleUpperCase(t.locale)}
                </span>
                <span className={sharingStyles["recipient-identity"]}>
                  <strong>{recipient.username}</strong>
                  <span>{recipient.email}</span>
                </span>
                {!selected && email === recipient.email && (
                  <Check size={18} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      <div
        className={
          selected
            ? sharingStyles["recipient-status"]
            : styles["visually-hidden"]
        }
        aria-live="polite"
        aria-atomic="true"
      >
        {selected && (
          <p className={sharingStyles["selected-recipient"]}>
            <Check size={20} aria-hidden="true" />
            {t("Invitation for @{username}", { username: selected.username })}
          </p>
        )}
      </div>
      <input type="hidden" name="recipientId" value={selected?.id ?? ""} />
      <div className={styles.field}>
        <label htmlFor={`${id}-email`}>
          {favorites.length ? t("Or invite by email") : t("Invitation email")}
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="off"
          spellCheck={false}
          required={!selected}
          maxLength={254}
          ref={emailInput}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setRecipientId("");
          }}
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
          aria-describedby={`${id}-role-help`}
          defaultValue={String(state.payload?.get("role") ?? "MEMBER")}
        >
          <option value="MEMBER">{t("Member — view and reserve")}</option>
          <option value="ADMIN">{t("Admin — edit and manage sharing")}</option>
        </select>
        <p id={`${id}-role-help`} className={styles["field-help"]}>
          {t(
            "Members can view and reserve wishes. Admins can also add and edit wishes and manage the list with you.",
          )}
        </p>
      </div>
      <button className={styles.button} type="submit">
        <Mail size={18} aria-hidden="true" />
        {pending ? t("Inviting…") : t("Send invitation")}
      </button>
    </fieldset>
  );
}
