import Link from "next/link";
import { ActionForm } from "@/components/form/action-form";
import styles from "@/components/shell.module.css";
import type { readWish } from "@/features/wish/service/wishes";
import { emailVerificationPath, reservationsPath, signInPath } from "@/paths";
import { cancel, reserve, revoke } from "../actions/manage-reservation";

export function ReservationControls({
  wish,
  user,
}: {
  wish: NonNullable<Awaited<ReturnType<typeof readWish>>>;
  user: { emailVerified: boolean } | null;
}) {
  const listId = wish.wishlist.id;

  return (
    <section
      className={styles["list-settings"]}
      aria-labelledby="reservation-heading"
    >
      <h2 id="reservation-heading">Reservation</h2>
      {wish.isReservedByYou && wish.reservationId ? (
        <>
          <p role="status">You reserved this wish. Your identity is private.</p>
          <Link href={reservationsPath}>View my reservations</Link>
          <ActionForm
            key={wish.reservationId}
            action={cancel.bind(null, listId, wish.id, wish.reservationId)}
            label="Cancel reservation"
            pendingLabel="Canceling…"
          >
            <p className={styles.muted}>
              Cancel when you no longer plan to get this gift.
            </p>
          </ActionForm>
        </>
      ) : wish.isReserved && wish.canManage && wish.reservationId ? (
        <ActionForm
          key={wish.reservationId}
          action={revoke.bind(null, listId, wish.id, wish.reservationId)}
          label="Revoke reservation"
          pendingLabel="Revoking…"
          destructive
        >
          <p className={styles.muted}>
            Revoking makes this wish available again when it is visible and
            published.
          </p>
        </ActionForm>
      ) : wish.canReserve ? (
        user?.emailVerified ? (
          <ActionForm
            key="reserve"
            action={reserve.bind(null, listId, wish.id)}
            label="Reserve wish"
            pendingLabel="Reserving…"
          >
            <p className={styles.muted}>
              Let others know this gift is taken. Only you and the list admins
              can view it while reserved; your identity stays private.
            </p>
          </ActionForm>
        ) : (
          <Link href={user ? emailVerificationPath : signInPath}>
            {user ? "Verify your email to reserve" : "Sign in to reserve"}
          </Link>
        )
      ) : (
        <p className={styles.muted}>
          Reservations are not available for this wish right now.
        </p>
      )}
    </section>
  );
}
