import { ArrowLeft, Eye, Info, Link2, Mail, Shield, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/cards/copy-link";
import { ListStatus } from "@/components/cards/list-status";
import { ActionForm } from "@/components/form/action-form";
import { LocalTime } from "@/components/local-time";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { cancelInvitation } from "@/features/sharing/actions/manage-sharing";
import { InvitationForm } from "@/features/sharing/components/invitation-form";
import { MemberAccess } from "@/features/sharing/components/member-access";
import sharingStyles from "@/features/sharing/components/sharing.module.css";
import { readSharing } from "@/features/sharing/service/queries";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import {
  accountPlanPath,
  guestLinksPath,
  listPath,
  listSettingsPath,
  sharingPath,
} from "@/paths";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getText();
  return {
    title: t("Sharing and members"),
    robots: { index: false, follow: false },
  };
}

export default async function SharingPage({
  params,
  searchParams,
}: {
  params: Promise<{ listId: string }>;
  searchParams: Promise<{
    members?: string;
    invitations?: string;
    changed?: string;
  }>;
}) {
  const t = await getText();

  const { user } = await getAuthOrRedirect();
  const { listId } = await params;
  const query = await searchParams;
  const list = await readSharing(
    listId,
    user.id,
    query.members,
    query.invitations,
  );
  if (!list) notFound();

  const isOwner = list.ownerId === user.id;
  const isPrivate = list.visibility === "PRIVATE";
  const visible = list.publication === "PUBLISHED";
  const pageUrl = (members: number, invitations: number) =>
    `${sharingPath(listId)}?${new URLSearchParams({ members: String(members), invitations: String(invitations) })}`;

  return (
    <div className={sharingStyles.page}>
      <header className={sharingStyles.header}>
        <Link href={listSettingsPath(listId)}>
          <ArrowLeft size={18} aria-hidden="true" />{" "}
          {t("Back to list settings")}
        </Link>
        <h1>{t("Sharing and members")}</h1>
        <p className={styles.description}>{list.title}</p>
      </header>
      {query.changed === "removed" && (
        <p role="status" className={styles.notice}>
          {t(
            "Member removed. Access through a public list or a guest link is separate.",
          )}
        </p>
      )}
      {query.changed === "revoked" && (
        <p role="status" className={styles.notice}>
          {t("Invitation canceled.")}
        </p>
      )}
      {query.changed === "transferred" && (
        <p role="status" className={styles.notice}>
          {t("Ownership transferred. You remain an admin.")}
        </p>
      )}

      <section
        className={sharingStyles.panel}
        aria-labelledby="list-access-heading"
      >
        <h2 id="list-access-heading">
          <Eye size={21} aria-hidden="true" /> {t("List access")}
        </h2>
        <div className={sharingStyles.access}>
          <div className={sharingStyles["access-summary"]}>
            <ListStatus
              publication={list.publication}
              visibility={list.visibility}
            />
            <p className={styles.muted}>
              {!visible
                ? t(
                    "Only admins can open this list. Choose Show list on the list page when you’re ready.",
                  )
                : isPrivate
                  ? t(
                      "Members can open this list with their account. Active guest links give view-only access.",
                    )
                  : t(
                      "Anyone can find this list in Browse or open its public link. No account is needed to view it.",
                    )}
            </p>
          </div>
          {visible && !isPrivate && (
            <CopyLink path={listPath(listId)} title={list.title} />
          )}
          <Link
            href={`${listSettingsPath(listId)}#list-visibility-heading`}
            className={styles["secondary-button"]}
          >
            {t("Go to list settings")}
          </Link>
        </div>
      </section>

      {!list.premium && (
        <p className={styles.notice}>
          {t(
            "The owner needs Premium for new invitations, guest links, and admin roles. Existing access stays available.",
          )}{" "}
          {isOwner && <Link href={accountPlanPath}>{t("View your plan")}</Link>}
        </p>
      )}

      <div className={sharingStyles.methods}>
        <section
          className={sharingStyles.panel}
          aria-labelledby="invite-heading"
        >
          <div className={sharingStyles.heading}>
            <h2 id="invite-heading">
              <Mail size={21} aria-hidden="true" /> {t("Invite someone")}
            </h2>
            <p className={styles.muted}>
              {t(
                "They join with an account and can reserve gifts when reservations are enabled.",
              )}
            </p>
          </div>
          {list.premium ? (
            <InvitationForm listId={listId} />
          ) : (
            <p className={styles.muted}>
              {t("Invitations are available when the owner has Premium.")}
            </p>
          )}
        </section>
        <section
          className={`${sharingStyles.panel} ${sharingStyles["guest-method"]}`}
          aria-labelledby="guest-sharing-heading"
        >
          <div className={sharingStyles.heading}>
            <h2 id="guest-sharing-heading">
              <Link2 size={21} aria-hidden="true" />{" "}
              {t("Share without an account")}
            </h2>
            <p className={styles.muted}>
              {t(
                "Create a guest link for someone who only needs to view your wishes.",
              )}
            </p>
          </div>
          <p className={sharingStyles.hint}>
            <Info size={18} aria-hidden="true" />{" "}
            {t(
              "Guests cannot reserve gifts or edit the list. Links have an expiry date and can be disabled.",
            )}
          </p>
          <Link
            href={guestLinksPath(listId)}
            className={styles["secondary-button"]}
          >
            {t("Manage guest links")}
          </Link>
        </section>
      </div>

      <section
        className={sharingStyles.panel}
        aria-labelledby="invitations-heading"
      >
        <div className={sharingStyles.heading}>
          <h2 id="invitations-heading">
            <Mail size={21} aria-hidden="true" /> {t("Pending invitations")}
          </h2>
          <p className={styles.muted}>
            {t(
              "People appear as members after they accept. Invitations expire after seven days.",
            )}
          </p>
        </div>
        {list.invitations.length ? (
          <ul className={sharingStyles.resources}>
            {list.invitations.map((invitation) => (
              <li key={invitation.id} className={sharingStyles.row}>
                <div className={sharingStyles.identity}>
                  <span className={sharingStyles.avatar} aria-hidden="true">
                    <Mail size={20} />
                  </span>
                  <div>
                    <h3>{invitation.email}</h3>
                    <p className={styles.muted}>
                      {invitation.role === "ADMIN" ? t("Admin") : t("Member")} ·{" "}
                      {invitation.expiresAt <= new Date()
                        ? t("Expired")
                        : invitation.deliveryFailedAt
                          ? t("Email not delivered — cancel and invite again")
                          : invitation.sentAt
                            ? t("Email sent")
                            : t("Email is being sent")}
                    </p>
                    <p className={styles.muted}>
                      {invitation.expiresAt <= new Date()
                        ? t("Expired")
                        : t("Expires")}{" "}
                      <LocalTime value={invitation.expiresAt.toISOString()} />
                    </p>
                  </div>
                </div>
                <ActionForm
                  action={cancelInvitation.bind(null, listId, invitation.id)}
                  label={t("Cancel invitation")}
                  pendingLabel={t("Canceling…")}
                  secondary
                >
                  {null}
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>
            {list.invitationsPage > 1
              ? t("No invitations on this page.")
              : list.premium
                ? t("No pending invitations. Send one above to get started.")
                : t("No pending invitations.")}
          </p>
        )}
        {(list.invitationsPage > 1 || list.moreInvitations) && (
          <nav className={styles.actions} aria-label={t("Invitation pages")}>
            {list.invitationsPage > 1 && (
              <Link href={pageUrl(list.membersPage, list.invitationsPage - 1)}>
                {t("Previous invitations")}
              </Link>
            )}
            <span>
              {t("Page")} {list.invitationsPage}
            </span>
            {list.moreInvitations && (
              <Link href={pageUrl(list.membersPage, list.invitationsPage + 1)}>
                {t("Next invitations")}
              </Link>
            )}
          </nav>
        )}
      </section>

      <section
        className={sharingStyles.panel}
        aria-labelledby="members-heading"
      >
        <div className={sharingStyles.heading}>
          <h2 id="members-heading">
            <Users size={21} aria-hidden="true" /> {t("Members")}
          </h2>
          <p className={styles.muted}>
            {t("Manage each person’s role or remove their membership.")}
          </p>
        </div>
        <ul className={sharingStyles.resources}>
          {list.memberships.map((member) => (
            <MemberAccess
              key={member.id}
              member={member}
              listId={listId}
              ownerId={list.ownerId}
              viewerId={user.id}
              premium={list.premium}
            />
          ))}
        </ul>
        <details className={styles.disclosure}>
          <summary>{t("About roles and ownership")}</summary>
          <p>
            <strong>{t("Members")}</strong>{" "}
            {t(
              "can view available wishes and reserve gifts when enabled. They cannot open hidden lists.",
            )}
          </p>
          <p>
            <strong>{t("Admins")}</strong>{" "}
            {t(
              "can edit wishes and settings, invite people, and manage access. Some changes need the owner’s Premium plan.",
            )}
          </p>
          <p>
            <Shield size={16} aria-hidden="true" />{" "}
            <strong>{t("The owner")}</strong>{" "}
            {t(
              "is also an admin. Only the owner can transfer the list to another admin, and must do that before leaving.",
            )}
          </p>
        </details>
        {(list.membersPage > 1 || list.moreMembers) && (
          <nav className={styles.actions} aria-label={t("Member pages")}>
            {list.membersPage > 1 && (
              <Link href={pageUrl(list.membersPage - 1, list.invitationsPage)}>
                {t("Previous members")}
              </Link>
            )}
            <span>
              {t("Page")} {list.membersPage}
            </span>
            {list.moreMembers && (
              <Link href={pageUrl(list.membersPage + 1, list.invitationsPage)}>
                {t("Next members")}
              </Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
