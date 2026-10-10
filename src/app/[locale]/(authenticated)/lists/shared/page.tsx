import type { Metadata } from "next";
import { ListWishCounts } from "@/components/cards/list-wish-counts";
import { ReservationAvailability } from "@/components/cards/reservation-availability";
import { ActionForm } from "@/components/form/action-form";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { deleteMembership } from "@/features/sharing/actions/manage-sharing";
import { readSharedLists } from "@/features/sharing/service/queries";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import {
  listPath,
  listSettingsPath,
  listsPath,
  sharedListsPath,
} from "@/paths";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getText();
  return {
    title: t("Lists shared with you"),
    robots: { index: false, follow: false },
  };
}

export default async function SharedListsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    joined?: string;
    left?: string;
    roleChanged?: string;
  }>;
}) {
  const t = await getText();

  const { user } = await getAuthOrRedirect();
  const query = await searchParams;
  const { lists, page, hasNextPage } = await readSharedLists(
    user.id,
    query.page,
  );
  return (
    <section className={styles.page}>
      <Link href={listsPath}>{t("Back to my lists")}</Link>
      <div className={styles["page-heading"]}>
        <div>
          <h1>{t("Lists shared with you")}</h1>
          <p className={styles.muted}>
            {t("Lists owned by other people that you have joined.")}
          </p>
        </div>
      </div>
      {query.roleChanged === "1" && (
        <p role="status" className={styles.notice}>
          {t("You are now a member. Admin controls are no longer available.")}
        </p>
      )}
      {query.joined === "1" && (
        <p role="status" className={styles.notice}>
          {t("Invitation accepted. You have joined the list.")}
        </p>
      )}
      {query.left === "1" && (
        <p role="status" className={styles.notice}>
          {t("You have left the list.")}
        </p>
      )}
      {lists.length ? (
        <ul className={styles["list-grid"]}>
          {lists.map((list) => (
            <li key={list.id} className={styles["list-card"]}>
              <h2>
                {list.title ? (
                  <Link href={listPath(list.listId)}>{list.title}</Link>
                ) : (
                  t("Hidden list")
                )}
              </h2>
              <p>
                {list.role === "ADMIN" ? t("Admin") : t("Member")}
                {!list.title && (
                  <> {t("· Available when the admins show it")}</>
                )}
              </p>
              {list.management && (
                <>
                  <ListWishCounts
                    availableWishCount={list.management.availableWishCount}
                    reservedWishCount={list.management.reservedWishCount}
                  />
                  <ReservationAvailability
                    enabled={list.management.reservationsEnabled}
                  />
                </>
              )}
              {list.role === "ADMIN" && (
                <Link href={listSettingsPath(list.listId)}>
                  {t("List settings")}
                </Link>
              )}
              <ActionForm
                action={deleteMembership.bind(null, list.listId, list.id)}
                label={t("Leave list")}
                pendingLabel={t("Leaving…")}
                destructive
              >
                <label className={styles["checkbox-label"]}>
                  <input type="checkbox" name="confirm" value="yes" required />
                  {t(
                    "Remove my membership. I will lose private access and any reservations that require it.",
                  )}
                </label>
              </ActionForm>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          {t(
            "No shared lists on this page. Accept an email invitation to join a list.",
          )}
        </p>
      )}
      {(page > 1 || hasNextPage) && (
        <nav className={styles.actions} aria-label={t("Shared list pages")}>
          {page > 1 && (
            <Link href={`${sharedListsPath}?page=${page - 1}`}>
              {t("Previous page")}
            </Link>
          )}
          <span>
            {t("Page")} {page}
          </span>
          {hasNextPage && (
            <Link href={`${sharedListsPath}?page=${page + 1}`}>
              {t("Next page")}
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
