import { Gift } from "lucide-react";
import { ActionForm } from "@/components/form/action-form";
import styles from "@/components/shell.module.css";
import { authReturnPath } from "@/features/auth/utils/return-to";
import type { readWish } from "@/features/wish/service/wishes";
import { Link } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import {
  emailVerificationPath,
  reservationsPath,
  signInPath,
  wishPath,
} from "@/paths";
import { cancel, reserve, revoke } from "../actions/manage-reservation";

export function ReservationControls({
  wish,
  user,
}: {
  wish: NonNullable<Awaited<ReturnType<typeof readWish>>>;
  user: { emailVerified: boolean } | null;
}) {
  const t = useText();

  const listId = wish.wishlist.id;

  return (
    <section
      className={styles["list-settings"]}
      aria-labelledby="reservation-heading"
    >
      <h2 id="reservation-heading" className={styles["icon-label"]}>
        <Gift size={22} aria-hidden="true" /> {t("Reservation")}
      </h2>
      {wish.isReservedByYou && wish.reservationId ? (
        <>
          <p role="status">
            {t("You reserved this wish. Your identity is private.")}
          </p>
          <Link href={reservationsPath}>{t("View my reservations")}</Link>
          <ActionForm
            key={wish.reservationId}
            action={cancel.bind(null, listId, wish.id, wish.reservationId)}
            label={t("Cancel reservation")}
            pendingLabel={t("Canceling…")}
          >
            <p className={styles.muted}>
              {t("Cancel when you no longer plan to get this gift.")}
            </p>
          </ActionForm>
        </>
      ) : wish.isReserved && wish.canManage && wish.reservationId ? (
        <ActionForm
          key={wish.reservationId}
          action={revoke.bind(null, listId, wish.id, wish.reservationId)}
          label={t("Revoke reservation")}
          pendingLabel={t("Revoking…")}
          destructive
        >
          <p className={styles.muted}>
            {t(
              "Revoking lets others view this wish again when the wish and its list are visible. They can reserve it if reservations are enabled.",
            )}
          </p>
        </ActionForm>
      ) : wish.canReserve ? (
        user?.emailVerified ? (
          <ActionForm
            key="reserve"
            action={reserve.bind(null, listId, wish.id)}
            label={t("Reserve wish")}
            pendingLabel={t("Reserving…")}
          >
            <p className={styles.muted}>
              {t(
                "Reserve this wish to avoid duplicate gifts. While reserved, it is hidden from everyone except you and the list admins. Your identity stays private. Reserving does not buy the item.",
              )}
            </p>
          </ActionForm>
        ) : (
          <Link
            href={authReturnPath(
              user ? emailVerificationPath : signInPath,
              wishPath(listId, wish.id),
            )}
          >
            {user ? t("Verify your email to reserve") : t("Sign in to reserve")}
          </Link>
        )
      ) : (
        <p className={styles.muted}>
          {t("Reservations are not available for this wish right now.")}
        </p>
      )}
    </section>
  );
}
