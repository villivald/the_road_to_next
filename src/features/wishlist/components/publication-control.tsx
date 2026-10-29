"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { ActionFeedback } from "@/components/form/action-feedback";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import shell from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";
import {
  changePublication,
  type PublicationState,
} from "../actions/manage-list";
import styles from "./publication-control.module.css";

export function PublicationControl({
  id,
  visible,
  secondary = false,
}: {
  id: string;
  visible: boolean;
  secondary?: boolean;
}) {
  const t = useText();
  const headingId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [dismissedAt, setDismissedAt] = useState<number>();
  const [state, submit, pending] = useActionState<PublicationState, FormData>(
    changePublication.bind(null, id),
    { ...EMPTY_ACTION_STATE, timestamp: 0 },
  );
  const review =
    dismissedAt === state.timestamp ? undefined : state.reservationReview;

  useEffect(() => {
    if (!review) return;
    dialog.current?.showModal();
    cancel.current?.focus();
    const button = trigger.current;
    return () => button?.focus();
  }, [review]);

  const confirmation = review ? (
    <form action={submit} className={styles.content} aria-busy={pending}>
      <h2 id={headingId}>{t("Hide this list?")}</h2>
      <p id={`${headingId}-description`}>
        {t(
          "These reservations will end and cannot be restored. Only list admins will be able to open the list.",
        )}
      </p>
      <p className={shell.eyebrow}>
        {t("Reserved wishes: {value0}", { value0: review.length })}
      </p>
      <ul className={styles.wishes}>
        {review.slice(0, 5).map((reservation) => (
          <li key={reservation.id}>{reservation.wishTitle}</li>
        ))}
      </ul>
      {review.length > 5 && (
        <p>{t("And {value0} more.", { value0: review.length - 5 })}</p>
      )}
      <input type="hidden" name="publication" value="DRAFT" />
      {review.map(({ id }) => (
        <input key={id} type="hidden" name="confirmedReservation" value={id} />
      ))}
      <div className={styles.actions}>
        <button
          ref={cancel}
          type="button"
          className={shell["secondary-button"]}
          disabled={pending}
          onClick={() => dialog.current?.close()}
        >
          {t("Cancel")}
        </button>
        <button
          type="submit"
          disabled={pending}
          className={shell["danger-button"]}
        >
          {pending ? t("Updating…") : t("Hide list and end reservations")}
        </button>
      </div>
    </form>
  ) : null;

  return (
    <div className={styles.control}>
      <form action={submit} className={shell.form} aria-busy={pending}>
        <ActionFeedback state={state} />
        <input
          type="hidden"
          name="publication"
          value={visible ? "DRAFT" : "PUBLISHED"}
        />
        <button
          ref={trigger}
          type="submit"
          disabled={pending}
          className={secondary ? shell["secondary-button"] : shell.button}
        >
          {visible ? (
            <EyeOff size={18} aria-hidden="true" />
          ) : (
            <Eye size={18} aria-hidden="true" />
          )}
          {pending ? t("Updating…") : visible ? t("Hide list") : t("Show list")}
        </button>
      </form>
      {review && (
        <dialog
          ref={dialog}
          className={styles.dialog}
          aria-labelledby={headingId}
          aria-describedby={`${headingId}-description`}
          onCancel={(event) => {
            if (pending) event.preventDefault();
          }}
          onClose={() => setDismissedAt(state.timestamp)}
        >
          {confirmation}
        </dialog>
      )}
    </div>
  );
}
