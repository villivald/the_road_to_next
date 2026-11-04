"use client";

import { LogOut } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { ActionFeedback } from "@/components/form/action-feedback";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import shell from "@/components/shell.module.css";
import { deleteMembership } from "@/features/sharing/actions/manage-sharing";
import { useText } from "@/i18n/use-text";
import styles from "./my-list-card.module.css";

type MembershipProps = {
  listId: string;
  membershipId: string;
  title: string | null;
};

function LeaveListDialog({
  listId,
  membershipId,
  title,
  onDismiss,
}: MembershipProps & { onDismiss: () => void }) {
  const t = useText();
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [state, submit, pending] = useActionState(
    deleteMembership.bind(null, listId, membershipId),
    { ...EMPTY_ACTION_STATE, timestamp: 0 },
  );

  useEffect(() => {
    dialog.current?.showModal();
    cancel.current?.focus();
  }, []);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={`${id}-heading`}
      aria-describedby={`${id}-title ${id}-consequences`}
      onClose={onDismiss}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <h2 id={`${id}-heading`}>{t("Leave this list?")}</h2>
      <p id={`${id}-title`} className={styles["dialog-title"]}>
        {title ?? t("Hidden list")}
      </p>
      <form action={submit} className={shell.form} aria-busy={pending}>
        <ActionFeedback state={state} />
        <label className={`${shell["checkbox-label"]} ${styles.confirmation}`}>
          <input
            type="checkbox"
            name="confirm"
            value="yes"
            required
            checked={confirmed}
            disabled={pending}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span id={`${id}-consequences`}>
            {t(
              "Remove my membership. I will lose private access and any reservations that require it.",
            )}
          </span>
        </label>
        <div className={styles["dialog-actions"]}>
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
            className={shell["danger-button"]}
            disabled={!confirmed || pending}
          >
            {pending ? t("Leaving…") : t("Leave list")}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function LeaveListButton(props: MembershipProps) {
  const t = useText();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={styles.leave}
        aria-label={t("Leave list")}
        title={t("Leave list")}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <LogOut size={18} aria-hidden="true" />
      </button>
      {open && (
        <LeaveListDialog
          {...props}
          onDismiss={() => {
            setOpen(false);
            trigger.current?.focus({ preventScroll: true });
          }}
        />
      )}
    </>
  );
}
