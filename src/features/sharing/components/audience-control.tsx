"use client";

import { Globe, Users } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { ActionFeedback } from "@/components/form/action-feedback";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import styles from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";
import { changeVisibility } from "../actions/manage-sharing";
import sharingStyles from "./sharing.module.css";

export function AudienceControl({
  listId,
  visibility,
  premium,
}: {
  listId: string;
  visibility: "PUBLIC" | "PRIVATE";
  premium: boolean;
}) {
  const t = useText();
  const id = useId();
  const [selected, setSelected] = useState(visibility);
  const [state, action, pending] = useActionState(
    changeVisibility.bind(null, listId),
    { ...EMPTY_ACTION_STATE, timestamp: 0 },
  );
  const changed = selected !== visibility;

  return (
    <form
      action={action}
      className={styles.form}
      aria-busy={pending}
      onReset={(event) => {
        // React owns the selected audience; a native reset restores the old radio default.
        event.preventDefault();
      }}
    >
      <ActionFeedback state={state} />
      <fieldset disabled={pending} className={sharingStyles.audience}>
        <legend className={styles["visually-hidden"]}>
          {t("Who can view this list?")}
        </legend>
        {(["PUBLIC", "PRIVATE"] as const).map((value) => {
          const publicAudience = value === "PUBLIC";
          const Icon = publicAudience ? Globe : Users;
          return (
            <label key={value} className={sharingStyles.choice}>
              <input
                type="radio"
                name="visibility"
                value={value}
                checked={selected === value}
                onChange={() => setSelected(value)}
                disabled={
                  !publicAudience && !premium && visibility !== "PRIVATE"
                }
                aria-labelledby={`${id}-${value}-label`}
                aria-describedby={`${id}-${value}-help`}
              />
              <span>
                <strong id={`${id}-${value}-label`}>
                  <Icon size={20} aria-hidden="true" />
                  {publicAudience ? t("Anyone") : t("Selected people")}
                </strong>
                <span id={`${id}-${value}-help`}>
                  {publicAudience
                    ? t(
                        "Appears in Browse. Anyone can view it without an account.",
                      )
                    : t(
                        "Hidden from Browse. Choose who to invite below. They sign in to view your list.",
                      )}
                  {!publicAudience && !premium && visibility !== "PRIVATE" && (
                    <> {t("Requires Premium.")}</>
                  )}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>
      {changed && (
        <fieldset
          disabled={pending}
          className={sharingStyles["audience-review"]}
        >
          <legend>{t("Review audience change")}</legend>
          <p className={styles.muted}>
            {t("Your current audience stays in place until you save.")}
          </p>
          <label
            className={styles["checkbox-label"]}
            key={`${selected}-${state.timestamp}`}
          >
            <input type="checkbox" name="confirm" value="yes" required />
            {selected === "PUBLIC"
              ? t(
                  "Anyone will be able to find this list in Browse when it is visible.",
                )
              : t(
                  "Only members and active guest links will have access. Reservations for people losing access will end.",
                )}
          </label>
          <button type="submit" className={styles.button}>
            {pending ? t("Saving…") : t("Save audience")}
          </button>
        </fieldset>
      )}
    </form>
  );
}
