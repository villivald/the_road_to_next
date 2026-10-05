import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/form/action-form";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import {
  cancelInvitation,
  changeVisibility,
  deleteMembership,
  transferList,
  updateMemberRole,
} from "@/features/sharing/actions/manage-sharing";
import { InvitationForm } from "@/features/sharing/components/invitation-form";
import sharingStyles from "@/features/sharing/components/sharing.module.css";
import { readSharing } from "@/features/sharing/service/queries";
import {
  accountPlanPath,
  guestLinksPath,
  listPath,
  sharingPath,
} from "@/paths";

export const metadata: Metadata = {
  title: "List sharing",
  robots: { index: false, follow: false },
};

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
  const pageUrl = (members: number, invitations: number) =>
    `${sharingPath(listId)}?${new URLSearchParams({ members: String(members), invitations: String(invitations) })}`;

  return (
    <section className={styles.editor}>
      <Link href={listPath(listId)}>Back to list</Link>
      <h1>Sharing and members</h1>
      <Link href={guestLinksPath(listId)}>Manage read-only guest links</Link>
      {query.changed === "removed" && (
        <p role="status" className={styles.notice}>
          Member removed. Independent public access remains available.
        </p>
      )}
      {query.changed === "revoked" && (
        <p role="status" className={styles.notice}>
          Invitation revoked.
        </p>
      )}
      {query.changed === "transferred" && (
        <p role="status" className={styles.notice}>
          Ownership transferred. You remain an admin.
        </p>
      )}
      <p className={styles.description}>{list.title}</p>
      <p>
        Admins manage content and people. Members can view published content and
        reserve available wishes. Drafts are admin-only.
      </p>
      {!list.premium && (
        <p className={styles.notice}>
          The owner needs Premium for new private lists, invitations,
          acceptance, and admin promotions. Existing access stays available; you
          can still remove access or transfer ownership.{" "}
          {isOwner && <Link href={accountPlanPath}>View your plan</Link>}
        </p>
      )}

      <h2>Visibility</h2>
      <p>
        This list is {isPrivate ? "private" : "public"}. Publishing is
        controlled separately on the list page.
      </p>
      {(isPrivate || list.premium) && (
        <ActionForm
          action={changeVisibility.bind(null, listId)}
          label={isPrivate ? "Make public" : "Make private"}
          pendingLabel="Updating…"
        >
          <input
            type="hidden"
            name="visibility"
            value={isPrivate ? "PUBLIC" : "PRIVATE"}
          />
          <label className={styles["checkbox-label"]}>
            <input type="checkbox" name="confirm" value="yes" required />
            {isPrivate
              ? "I understand that anyone can browse this list and its available wishes when published."
              : "Limit published content to members. Reservations for people losing access will end."}
          </label>
        </ActionForm>
      )}

      <h2>Invite someone</h2>
      {list.premium ? (
        <InvitationForm listId={listId} />
      ) : (
        <p>Invitations are available when the owner has Premium.</p>
      )}

      <h2>Pending invitations</h2>
      {list.invitations.length ? (
        <ul className={styles["list-grid"]}>
          {list.invitations.map((invitation) => (
            <li key={invitation.id} className={styles["list-card"]}>
              <h3>{invitation.email}</h3>
              <p>
                {invitation.role === "ADMIN" ? "Admin" : "Member"} ·{" "}
                {invitation.expiresAt <= new Date()
                  ? "Expired"
                  : invitation.deliveryFailedAt
                    ? "Delivery failed — revoke and invite again"
                    : invitation.sentAt
                      ? "Email sent"
                      : "Email queued for delivery"}
              </p>
              <p>
                Expires{" "}
                <time dateTime={invitation.expiresAt.toISOString()}>
                  {invitation.expiresAt.toLocaleString("en-GB", {
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </time>
              </p>
              <ActionForm
                action={cancelInvitation.bind(null, listId, invitation.id)}
                label="Revoke invitation"
                pendingLabel="Revoking…"
              >
                <p className={styles.muted}>
                  The recipient will no longer be able to join using this
                  invitation.
                </p>
              </ActionForm>
            </li>
          ))}
        </ul>
      ) : (
        <p>No pending invitations on this page.</p>
      )}
      {(list.invitationsPage > 1 || list.moreInvitations) && (
        <nav className={styles.actions} aria-label="Invitation pages">
          {list.invitationsPage > 1 && (
            <Link href={pageUrl(list.membersPage, list.invitationsPage - 1)}>
              Previous invitations
            </Link>
          )}
          <span>Page {list.invitationsPage}</span>
          {list.moreInvitations && (
            <Link href={pageUrl(list.membersPage, list.invitationsPage + 1)}>
              Next invitations
            </Link>
          )}
        </nav>
      )}

      <h2>Members</h2>
      <ul className={`${styles["list-grid"]} ${sharingStyles.members}`}>
        {list.memberships.map((member) => {
          const owner = member.userId === list.ownerId;
          const self = member.userId === user.id;
          return (
            <li key={member.id} className={styles["list-card"]}>
              <h3>
                {member.user.username}
                {self ? " (you)" : ""}
              </h3>
              <p>
                {owner
                  ? "Owner · Admin"
                  : member.role === "ADMIN"
                    ? "Admin"
                    : "Member"}
              </p>
              {!owner && (
                <>
                  {(member.role === "ADMIN" || list.premium) && (
                    <ActionForm
                      action={updateMemberRole.bind(null, listId, member.id)}
                      label={
                        member.role === "ADMIN" ? "Make member" : "Make admin"
                      }
                      pendingLabel="Updating…"
                    >
                      <input
                        type="hidden"
                        name="role"
                        value={member.role === "ADMIN" ? "MEMBER" : "ADMIN"}
                      />
                      <label className={styles["checkbox-label"]}>
                        <input
                          type="checkbox"
                          name="confirm"
                          value="yes"
                          required
                        />
                        Confirm role change for {member.user.username}.{" "}
                        {member.role === "ADMIN"
                          ? "Their pending invitations will be revoked."
                          : "They will be able to edit content and manage people."}
                      </label>
                    </ActionForm>
                  )}
                  <ActionForm
                    action={deleteMembership.bind(null, listId, member.id)}
                    label={self ? "Leave list" : "Remove member"}
                    pendingLabel="Removing…"
                    destructive
                  >
                    <label className={styles["checkbox-label"]}>
                      <input
                        type="checkbox"
                        name="confirm"
                        value="yes"
                        required
                      />
                      Remove {self ? "my" : `${member.user.username}'s`}{" "}
                      membership. Private access and affected reservations will
                      end; public access remains.
                    </label>
                  </ActionForm>
                  {isOwner && member.role === "ADMIN" && (
                    <ActionForm
                      action={transferList.bind(null, listId, member.id)}
                      label="Transfer ownership"
                      pendingLabel="Transferring…"
                    >
                      <label className={styles["checkbox-label"]}>
                        <input
                          type="checkbox"
                          name="confirm"
                          value="yes"
                          required
                        />
                        Make {member.user.username} the owner. I remain an admin
                        but cannot take ownership back myself. Their Premium
                        status will apply to this list.
                      </label>
                    </ActionForm>
                  )}
                </>
              )}
              {owner && (
                <p className={styles.muted}>
                  Ownership must be transferred to another admin before the
                  owner can leave.
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {(list.membersPage > 1 || list.moreMembers) && (
        <nav className={styles.actions} aria-label="Member pages">
          {list.membersPage > 1 && (
            <Link href={pageUrl(list.membersPage - 1, list.invitationsPage)}>
              Previous members
            </Link>
          )}
          <span>Page {list.membersPage}</span>
          {list.moreMembers && (
            <Link href={pageUrl(list.membersPage + 1, list.invitationsPage)}>
              Next members
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
