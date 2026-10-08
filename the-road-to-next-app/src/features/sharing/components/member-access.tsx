import {
  ArrowRightLeft,
  Shield,
  UserRound,
  UserRoundMinus,
} from "lucide-react";
import { ActionForm } from "@/components/form/action-form";
import styles from "@/components/shell.module.css";
import {
  deleteMembership,
  transferList,
  updateMemberRole,
} from "../actions/manage-sharing";
import type { readSharing } from "../service/queries";
import sharingStyles from "./sharing.module.css";

type Member = NonNullable<
  Awaited<ReturnType<typeof readSharing>>
>["memberships"][number];

export function MemberAccess({
  member,
  listId,
  ownerId,
  viewerId,
  premium,
}: {
  member: Member;
  listId: string;
  ownerId: string | null;
  viewerId: string;
  premium: boolean;
}) {
  const owner = member.userId === ownerId;
  const self = member.userId === viewerId;
  const admin = member.role === "ADMIN";
  const name = member.user.username;

  return (
    <li className={sharingStyles.row}>
      <div className={sharingStyles.identity}>
        <span className={sharingStyles.avatar} aria-hidden="true">
          {admin ? <Shield size={20} /> : <UserRound size={20} />}
        </span>
        <div>
          <h3>
            {name}
            {self ? " (you)" : ""}
          </h3>
          <p className={styles.muted}>
            {owner ? "Owner · Admin" : admin ? "Admin" : "Member"}
          </p>
        </div>
      </div>
      {owner ? (
        <p className={sharingStyles["row-note"]}>
          {self ? "You own this list." : "Owns this list."}
        </p>
      ) : (
        <details className={sharingStyles.management}>
          <summary>
            Manage access
            <span className={styles["visually-hidden"]}> for {name}</span>
          </summary>
          <div className={sharingStyles.controls}>
            {(admin || premium) && (
              <ActionForm
                action={updateMemberRole.bind(null, listId, member.id)}
                label={admin ? "Make member" : "Make admin"}
                secondary
                pendingLabel="Updating…"
                icon={<Shield size={18} aria-hidden="true" />}
              >
                <input
                  type="hidden"
                  name="role"
                  value={admin ? "MEMBER" : "ADMIN"}
                />
                <label className={styles["checkbox-label"]}>
                  <input type="checkbox" name="confirm" value="yes" required />
                  {admin
                    ? `${name} will lose admin controls. Invitations they sent that have not been accepted will be canceled.`
                    : `${name} will be able to edit wishes, change settings, and manage members.`}
                </label>
              </ActionForm>
            )}
            <ActionForm
              action={deleteMembership.bind(null, listId, member.id)}
              label={self ? "Leave list" : "Remove member"}
              pendingLabel="Removing…"
              destructive
              icon={<UserRoundMinus size={18} aria-hidden="true" />}
            >
              <label className={styles["checkbox-label"]}>
                <input type="checkbox" name="confirm" value="yes" required />
                {self ? "I will lose" : `${name} will lose`} membership access
                and reservations that depend on it. Access through a public list
                or a guest link is separate.
              </label>
            </ActionForm>
            {viewerId === ownerId && admin && (
              <details className={sharingStyles.transfer}>
                <summary>Transfer ownership</summary>
                <ActionForm
                  action={transferList.bind(null, listId, member.id)}
                  label="Transfer ownership"
                  pendingLabel="Transferring…"
                  icon={<ArrowRightLeft size={18} aria-hidden="true" />}
                >
                  <label className={styles["checkbox-label"]}>
                    <input
                      type="checkbox"
                      name="confirm"
                      value="yes"
                      required
                    />
                    Make {name} the owner. I will stay an admin, but only the
                    new owner can transfer it back. Their Premium plan will
                    apply to this list.
                  </label>
                </ActionForm>
              </details>
            )}
          </div>
        </details>
      )}
    </li>
  );
}
