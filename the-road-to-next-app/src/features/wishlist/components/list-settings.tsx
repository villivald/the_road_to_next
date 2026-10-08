import { Eye, EyeOff, Gift, LockKeyhole, Share2, Trash2 } from "lucide-react";
import Link from "next/link";
import { ActionForm } from "@/components/form/action-form";
import styles from "@/components/shell.module.css";
import { listPath, sharingPath } from "@/paths";
import { changePublication } from "../actions/manage-list";
import settingsStyles from "./list-settings.module.css";

export function ListSettings({
  list,
}: {
  list: {
    id: string;
    publication: "DRAFT" | "PUBLISHED";
    visibility: "PUBLIC" | "PRIVATE";
    reservationsEnabled: boolean;
  };
}) {
  const visible = list.publication === "PUBLISHED";
  const anyone = list.visibility === "PUBLIC";
  const VisibilityIcon = !visible ? EyeOff : anyone ? Eye : LockKeyhole;

  return (
    <section
      className={settingsStyles.settings}
      aria-labelledby="list-settings-heading"
    >
      <div className={settingsStyles.heading}>
        <h2 id="list-settings-heading">List settings</h2>
        <Link
          className={styles["secondary-button"]}
          href={sharingPath(list.id)}
        >
          <Share2 size={18} aria-hidden="true" /> Sharing and members
        </Link>
      </div>
      <dl className={settingsStyles.summary}>
        <div>
          <dt>
            <VisibilityIcon size={20} aria-hidden="true" /> Who can see it
          </dt>
          <dd>
            {!visible
              ? "Only list admins. This list is hidden from viewers."
              : anyone
                ? "Anyone can find this list in Browse and open its link."
                : "Invited members and people with an active guest link."}
          </dd>
        </div>
        <div>
          <dt>
            <Gift size={20} aria-hidden="true" /> Gift reservations
          </dt>
          <dd>
            <p>
              Reservations: {list.reservationsEnabled ? "enabled" : "disabled"}.
            </p>
            <p className={styles.muted}>
              {list.reservationsEnabled
                ? visible
                  ? "People can reserve available wishes to avoid duplicate gifts."
                  : "People can reserve wishes once you show this list."
                : "New reservations are off. Existing reservations stay active."}
            </p>
          </dd>
        </div>
      </dl>
      <div className={settingsStyles.publication}>
        <div>
          <h3>{visible ? "Hide from viewers" : "Ready to share?"}</h3>
          <p className={styles.muted}>
            {visible
              ? "Only admins will see it. Active reservations will end."
              : anyone
                ? "Make this list visible to anyone, including in Browse."
                : "Make this list visible to people with access."}
          </p>
        </div>
        <ActionForm
          action={changePublication.bind(null, list.id)}
          label={visible ? "Hide list" : "Show list"}
          pendingLabel="Updating…"
          icon={
            visible ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )
          }
        >
          <input
            type="hidden"
            name="publication"
            value={visible ? "DRAFT" : "PUBLISHED"}
          />
        </ActionForm>
      </div>
      <div className={settingsStyles.deletion}>
        <p className={styles.muted}>
          Permanently remove this list and its wishes.
        </p>
        <Link
          className={settingsStyles["delete-link"]}
          href={`${listPath(list.id)}/delete`}
        >
          <Trash2 size={18} aria-hidden="true" /> Delete list
        </Link>
      </div>
    </section>
  );
}
