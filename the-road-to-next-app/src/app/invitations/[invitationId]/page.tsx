import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/form/action-form";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { joinList } from "@/features/sharing/actions/manage-sharing";
import { readInvitation } from "@/features/sharing/service/invitations";
import { invitationPath, sharedListsPath } from "@/paths";

export const metadata: Metadata = {
  title: "List invitation",
  robots: { index: false, follow: false },
};

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  const { user } = await getAuthOrRedirect({
    returnTo: invitationPath(invitationId),
  });
  const invitation = await readInvitation(invitationId, user.id);
  return (
    <section className={styles.editor}>
      <h1>List invitation</h1>
      {invitation ? (
        <>
          <p>Invited by {invitation.invitedBy}.</p>
          <p>
            You have been invited as{" "}
            {invitation.role === "ADMIN"
              ? "an admin who can manage content and people"
              : "a member who can view published content and reserve available wishes"}
            . List content becomes available after you join.
          </p>
          <p>
            Expires{" "}
            <time dateTime={invitation.expiresAt.toISOString()}>
              {invitation.expiresAt.toLocaleString("en-GB", {
                timeZone: "UTC",
              })}{" "}
              UTC
            </time>
            .
          </p>
          {invitation.canAccept ? (
            <ActionForm
              action={joinList.bind(null, invitation.id)}
              label="Join list"
              pendingLabel="Joining…"
            >
              <label className={styles["checkbox-label"]}>
                <input type="checkbox" name="confirm" value="yes" required />I
                want to join this list. Its admins will see my username and
                membership role.
              </label>
            </ActionForm>
          ) : (
            <p>
              The list owner needs active Premium before you can join. Contact
              the person who invited you.
            </p>
          )}
        </>
      ) : (
        <p>
          This invitation is unavailable. Sign in with the invited email or ask
          the list admin for a new invitation.
        </p>
      )}
      <Link href={sharedListsPath}>Lists with access to</Link>
    </section>
  );
}
