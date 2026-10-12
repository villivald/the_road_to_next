import type { Metadata } from "next";
import { navigationPath } from "@/app/_navigation/navigation-path";
import { CardMedia, CardMediaLink } from "@/components/cards/card-media";
import { WishStatus } from "@/components/cards/wish-status";
import { ActionForm } from "@/components/form/action-form";
import { SuccessMessage } from "@/components/form/success-message";
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
        <SuccessMessage>{t("Reservation canceled.")}</SuccessMessage>
      )}
      {reservations.length ? (
        <ul className={styles["list-grid"]}>
          {reservations.map(({ id, wish }) => (
            <li key={id} className={styles["list-card"]}>
              <CardMediaLink
                path={navigationPath(
                  wishPath(wish.wishlist.id, wish.id),
                  "reservations",
                )}
                title={wish.title}
              >
                <CardMedia image={wish.image} title={wish.title} />
              </CardMediaLink>
              <h2>
                <Link
                  href={navigationPath(
                    wishPath(wish.wishlist.id, wish.id),
                    "reservations",
                  )}
                >
                  {wish.title}
                </Link>
              </h2>
              <p>
                {t("In")}{" "}
                <Link
                  href={navigationPath(
                    listPath(wish.wishlist.id),
                    "reservations",
                  )}
                >
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
