"use client";

import { Heart, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import cardStyles from "@/components/cards/cards.module.css";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import shell from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";
import { changeFavorite } from "../actions/manage-favorites";
import type { FavoriteTarget } from "../types";
import styles from "./favorites.module.css";

export function FavoriteButton({
  kind,
  targetId,
  saved,
  title,
}: FavoriteTarget & { title: string }) {
  const t = useText();
  const [state, submit, pending] = useActionState(
    changeFavorite.bind(null, kind, targetId),
    { ...EMPTY_ACTION_STATE, timestamp: 0 },
  );
  const label = t(
    saved ? "Remove {title} from favorites" : "Add {title} to favorites",
    { title },
  );
  return (
    <form action={submit} className={styles.control} aria-busy={pending}>
      <input type="hidden" name="saved" value={String(!saved)} />
      <button
        type="submit"
        className={`${cardStyles["icon-action"]} ${styles.button}`}
        aria-label={label}
        title={label}
        aria-pressed={saved}
        disabled={pending}
      >
        {pending ? (
          <LoaderCircle
            size={18}
            aria-hidden="true"
            className={styles.spinner}
          />
        ) : (
          <Heart
            size={18}
            aria-hidden="true"
            fill={saved ? "currentColor" : "none"}
          />
        )}
      </button>
      <span
        role={
          state.message
            ? state.status === "ERROR"
              ? "alert"
              : "status"
            : undefined
        }
        aria-live="polite"
        className={
          state.status === "ERROR" ? styles.error : shell["visually-hidden"]
        }
      >
        {state.message ? t.feedback(state) : null}
      </span>
    </form>
  );
}
