import { Eye, EyeOff, Link2, LockKeyhole, Share2, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/form/action-form";
import styles from "@/components/shell.module.css";
import { changeVisibility } from "@/features/sharing/actions/manage-sharing";
import { Link } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import { guestLinksPath, listPath, sharingPath } from "@/paths";
import { changePublication } from "../actions/manage-list";
import settingsStyles from "./list-settings.module.css";

export function ListSettings({
  list,
  premium,
}: {
  premium: boolean;
  list: {
    id: string;
    publication: "DRAFT" | "PUBLISHED";
    visibility: "PUBLIC" | "PRIVATE";
  };
}) {
  const t = useText();

  const isPrivate = list.visibility === "PRIVATE";
  const visible = list.publication === "PUBLISHED";
  const anyone = list.visibility === "PUBLIC";
  const VisibilityIcon = !visible ? EyeOff : anyone ? Eye : LockKeyhole;

  return (
    <>
      <section
        className={settingsStyles.settings}
        aria-labelledby="list-visibility-heading"
      >
        <div className={settingsStyles.heading}>
          <h2 id="list-visibility-heading">{t("Visibility and access")}</h2>
        </div>
        <dl className={settingsStyles.summary}>
          <div>
            <dt>
              <VisibilityIcon size={20} aria-hidden="true" />{" "}
              {t("Who can see it")}
            </dt>
            <dd>
              {!visible
                ? t("Only list admins. This list is hidden from viewers.")
                : anyone
                  ? t("Anyone can find this list in Browse and open its link.")
                  : t("Invited members and people with an active guest link.")}
            </dd>
          </div>
        </dl>
        <details className={styles.disclosure}>
          <summary>{t("Change who can see this list")}</summary>
          <p className={styles.muted}>
            {t(
              "This sets the audience for a visible list. Hidden lists stay admin-only.",
            )}
          </p>
          {isPrivate || premium ? (
            <ActionForm
              action={changeVisibility.bind(null, list.id)}
              label={isPrivate ? t("Allow anyone") : t("Limit access")}
              secondary
              pendingLabel={t("Updating…")}
            >
              <input
                type="hidden"
                name="visibility"
                value={isPrivate ? "PUBLIC" : "PRIVATE"}
              />
              <label className={styles["checkbox-label"]}>
                <input type="checkbox" name="confirm" value="yes" required />
                {isPrivate
                  ? t(
                      "Anyone will be able to find this list in Browse when it is visible.",
                    )
                  : t(
                      "Only members and active guest links will have access. Reservations for people losing access will end.",
                    )}
              </label>
            </ActionForm>
          ) : (
            <p className={styles.muted}>
              {t("The owner needs Premium to limit who can view this list.")}
            </p>
          )}
        </details>
        <div className={settingsStyles.publication}>
          <div>
            <h3>{visible ? t("Hide from viewers") : t("Ready to share?")}</h3>
            <p className={styles.muted}>
              {visible
                ? t("Only admins will see it. Active reservations will end.")
                : anyone
                  ? t("Make this list visible to anyone, including in Browse.")
                  : t("Make this list visible to people with access.")}
            </p>
          </div>
          <ActionForm
            action={changePublication.bind(null, list.id)}
            label={visible ? t("Hide list") : t("Show list")}
            pendingLabel={t("Updating…")}
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
      </section>
      <section
        className={settingsStyles.settings}
        aria-labelledby="list-sharing-heading"
      >
        <h2 id="list-sharing-heading">{t("Sharing and members")}</h2>
        <div className={styles.actions}>
          <Link
            className={styles["secondary-button"]}
            href={sharingPath(list.id)}
          >
            <Share2 size={18} aria-hidden="true" /> {t("Sharing and members")}
          </Link>
          <Link
            className={styles["secondary-button"]}
            href={guestLinksPath(list.id)}
          >
            <Link2 size={18} aria-hidden="true" /> {t("Manage guest links")}
          </Link>
        </div>
      </section>
      <section
        className={settingsStyles.settings}
        aria-labelledby="list-delete-heading"
      >
        <h2 id="list-delete-heading">{t("Delete list")}</h2>
        <div className={settingsStyles.deletion}>
          <p className={styles.muted}>
            {t("Permanently remove this list and its wishes.")}
          </p>
          <Link
            className={settingsStyles["delete-link"]}
            href={`${listPath(list.id)}/delete`}
          >
            <Trash2 size={18} aria-hidden="true" /> {t("Delete list")}
          </Link>
        </div>
      </section>
    </>
  );
}
