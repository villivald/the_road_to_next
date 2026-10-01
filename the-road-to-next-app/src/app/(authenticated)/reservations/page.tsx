import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/form/action-form";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { MediaImage } from "@/features/media/components/media-image";
import { cancel } from "@/features/reservation/actions/manage-reservation";
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
    <section className={styles.page}>
      <div>
        <h1>My reservations</h1>
        <p className={styles.muted}>
          Gifts you plan to get. Your identity is private.
        </p>
      </div>
      {query.canceled === "1" && (
        <p role="status" className={styles.notice}>
          Reservation canceled.
        </p>
      )}
      {reservations.length ? (
        <ul className={styles["list-grid"]}>
          {reservations.map(({ id, wish }) => (
            <li key={id} className={styles["list-card"]}>
              <MediaImage image={wish.image} compact />
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
              <p>{formatWishPrice(wish.priceMinor, wish.currency)}</p>
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
        <div className={styles["empty-state"]}>
          <h2>
            {page === 1 ? "No active reservations" : "No more reservations"}
          </h2>
          <p className={styles.muted}>
            {page === 1
              ? "Open a shared wishlist and reserve a wish to find it here."
              : "Return to an earlier page."}
          </p>
        </div>
      )}
      <p className={styles.muted}>
        A reservation ends when a wish is hidden, fulfilled, or deleted, or when
        you lose access to its list.
      </p>
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
    </section>
  );
}
