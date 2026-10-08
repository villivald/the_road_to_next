import type { Metadata } from "next";
import Link from "next/link";
import { CardMedia } from "@/components/cards/card-media";
import { WishStatus } from "@/components/cards/wish-status";
import { ActionForm } from "@/components/form/action-form";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { cancel } from "@/features/reservation/actions/manage-reservation";
import {
  EmptyReservations,
  ReservationHelp,
  ReservationsFrame,
} from "@/features/reservation/components/reservations-frame";
import { readMyReservations } from "@/features/reservation/service/reservations";
import { formatWishPrice } from "@/features/wish/utils/money";
import { listPath, reservationsPath, wishPath } from "@/paths";

export const metadata: Metadata = {
  title: "My reservations",
  robots: { index: false, follow: false },
};

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; canceled?: string }>;
}) {
  const { user } = await getAuthOrRedirect();
  const query = await searchParams;
  const { reservations, page, hasNextPage } = await readMyReservations(
    user.id,
    Number(query.page ?? 1),
  );

  return (
    <ReservationsFrame>
      {query.canceled === "1" && (
        <p role="status" className={styles.notice}>
          Reservation canceled.
        </p>
      )}
      {reservations.length ? (
        <ul className={styles["list-grid"]}>
          {reservations.map(({ id, wish }) => (
            <li key={id} className={styles["list-card"]}>
              <CardMedia image={wish.image} />
              <h2>
                <Link href={wishPath(wish.wishlist.id, wish.id)}>
                  {wish.title}
                </Link>
              </h2>
              <p>
                In{" "}
                <Link href={listPath(wish.wishlist.id)}>
                  {wish.wishlist.title}
                </Link>
              </p>
              <p className={styles.price}>
                {formatWishPrice(wish.priceMinor, wish.currency)}
              </p>
              <WishStatus reserved reservedByYou />
              <ActionForm
                action={cancel.bind(null, wish.wishlist.id, wish.id, id)}
                label="Cancel reservation"
                pendingLabel="Canceling…"
              >
                <span className={styles["visually-hidden"]}>
                  Cancel your reservation for {wish.title}
                </span>
              </ActionForm>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyReservations page={page} />
      )}
      <ReservationHelp />
      {(page > 1 || hasNextPage) && (
        <nav className={styles.actions} aria-label="Reservation pages">
          {page > 1 && (
            <Link href={`${reservationsPath}?page=${page - 1}`}>
              Previous page
            </Link>
          )}
          <span>Page {page}</span>
          {hasNextPage && (
            <Link href={`${reservationsPath}?page=${page + 1}`}>Next page</Link>
          )}
        </nav>
      )}
    </ReservationsFrame>
  );
}
