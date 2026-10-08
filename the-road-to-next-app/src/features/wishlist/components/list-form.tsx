"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { ActionFeedback } from "@/components/form/action-feedback";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import styles from "@/components/shell.module.css";
import { listPath, listsPath } from "@/paths";
import { createList, updateList } from "../actions/manage-list";
import formStyles from "./list-form.module.css";

type ListValues = {
  id: string;
  title: string;
  description: string | null;
  reservationsEnabled: boolean;
};

export function ListForm({
  list,
  canCreatePrivate = false,
}: {
  list?: ListValues;
  canCreatePrivate?: boolean;
}) {
  const [state, action, pending] = useActionState(
    list ? updateList.bind(null, list.id) : createList,
    { ...EMPTY_ACTION_STATE, timestamp: 0 },
  );
  const prefix = useId();

  const fieldValue = (name: "title" | "description") => {
    const submitted = state.payload?.get(name);

    return typeof submitted === "string" ? submitted : (list?.[name] ?? "");
  };

  return (
    <form action={action} className={styles.form} aria-busy={pending}>
      <ActionFeedback state={state} />

      <fieldset
        key={state.timestamp}
        disabled={pending}
        className={styles["form-fields"]}
      >
        <legend className={styles["visually-hidden"]}>List details</legend>

        <div className={styles.field}>
          <label htmlFor={`${prefix}-title`}>Title</label>
          <input
            id={`${prefix}-title`}
            name="title"
            required
            maxLength={200}
            defaultValue={fieldValue("title")}
            aria-invalid={!!state.fieldErrors.title?.length}
            aria-describedby={`${prefix}-title-help`}
          />
          <p
            id={`${prefix}-title-help`}
            className={
              state.fieldErrors.title ? styles["error-text"] : styles.muted
            }
          >
            {state.fieldErrors.title?.join(" ") ??
              "Give your list a name. Up to 200 characters."}
          </p>
        </div>

        <div className={styles.field}>
          <label htmlFor={`${prefix}-description`}>
            Description (optional)
          </label>
          <textarea
            id={`${prefix}-description`}
            name="description"
            rows={5}
            maxLength={2000}
            defaultValue={fieldValue("description")}
            aria-invalid={!!state.fieldErrors.description?.length}
            aria-describedby={`${prefix}-description-help`}
          />
          <p
            id={`${prefix}-description-help`}
            className={
              state.fieldErrors.description
                ? styles["error-text"]
                : styles.muted
            }
          >
            {state.fieldErrors.description?.join(" ") ??
              "Add a little context. Up to 2,000 characters."}
          </p>
        </div>

        <div>
          <label className={styles["checkbox-label"]}>
            <input
              type="checkbox"
              name="reservationsEnabled"
              defaultChecked={
                state.payload
                  ? state.payload.get("reservationsEnabled") === "on"
                  : (list?.reservationsEnabled ?? false)
              }
              aria-describedby={`${prefix}-reservations-help`}
            />
            Allow reservations
          </label>
          <p id={`${prefix}-reservations-help`} className={styles.muted}>
            Applies once the list is visible. Turning this off keeps existing
            reservations.
          </p>
        </div>

        {!list && (
          <fieldset
            className={formStyles.audience}
            aria-describedby={`${prefix}-visibility-help`}
          >
            <legend>Who can view it when you show the list?</legend>
            <label className={formStyles.choice}>
              <input
                type="radio"
                name="visibility"
                value="PUBLIC"
                defaultChecked={
                  (state.payload?.get("visibility") ?? "PUBLIC") === "PUBLIC"
                }
                aria-labelledby={`${prefix}-public-label`}
                aria-describedby={`${prefix}-public-help`}
              />
              <span>
                <strong id={`${prefix}-public-label`}>Anyone</strong>
                <span id={`${prefix}-public-help`}>
                  Appears in Browse. Anyone can view it without an account.
                </span>
              </span>
            </label>
            <label className={formStyles.choice}>
              <input
                type="radio"
                name="visibility"
                value="PRIVATE"
                disabled={!canCreatePrivate}
                defaultChecked={state.payload?.get("visibility") === "PRIVATE"}
                aria-labelledby={`${prefix}-private-label`}
                aria-describedby={`${prefix}-private-help`}
              />
              <span>
                <strong id={`${prefix}-private-label`}>
                  People with access
                </strong>
                <span id={`${prefix}-private-help`}>
                  Stays out of Browse. Invited members and anyone with a guest
                  link can view it.
                  {!canCreatePrivate && " Requires Premium."}
                </span>
              </span>
            </label>
            <p id={`${prefix}-visibility-help`} className={styles.muted}>
              Your list starts hidden. Only admins can view it until you choose
              Show list. You can change its audience later in Sharing and
              members.
            </p>
          </fieldset>
        )}

        <div className={styles.actions}>
          <button type="submit" className={styles.button}>
            {pending ? "Saving…" : list ? "Save changes" : "Create list"}
          </button>
          <Link href={list ? listPath(list.id) : listsPath}>Cancel</Link>
        </div>
      </fieldset>
    </form>
  );
}
