import type { Metadata } from "next";
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
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import { listPath, reservationsPath, wishPath } from "@/paths";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getText();
  return {
    title: t("My reservations"),
    robots: { index: false, follow: false },
  };
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; canceled?: string }>;
}) {
  const t = await getText();

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
          {t("Reservation canceled.")}
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
                {t("In")}{" "}
                <Link href={listPath(wish.wishlist.id)}>
                  {wish.wishlist.title}
                </Link>
              </p>
              <p className={styles.price}>
                {formatWishPrice(wish.priceMinor, wish.currency, t.locale)}
              </p>
              <WishStatus reserved reservedByYou />
              <ActionForm
                action={cancel.bind(null, wish.wishlist.id, wish.id, id)}
                label={t("Cancel reservation")}
                pendingLabel={t("Canceling…")}
              >
                <span className={styles["visually-hidden"]}>
                  {t("Cancel your reservation for")} {wish.title}
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
        <nav className={styles.actions} aria-label={t("Reservation pages")}>
          {page > 1 && (
            <Link href={`${reservationsPath}?page=${page - 1}`}>
              {t("Previous page")}
            </Link>
          )}
          <span>
            {t("Page")} {page}
          </span>
          {hasNextPage && (
            <Link href={`${reservationsPath}?page=${page + 1}`}>
              {t("Next page")}
            </Link>
          )}
        </nav>
      )}
    </ReservationsFrame>
  );
}
