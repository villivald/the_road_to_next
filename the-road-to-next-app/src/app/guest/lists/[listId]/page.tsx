import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CardMedia } from "@/components/cards/card-media";
import styles from "@/components/shell.module.css";
import { GUEST_COOKIE } from "@/features/guest/http";
import {
  readGuestList,
  readGuestWishes,
} from "@/features/guest/service/access";
import { MediaImage } from "@/features/media/components/media-image";
import { WishPriority } from "@/features/wish/components/wish-priority";
import { formatWishPrice } from "@/features/wish/utils/money";
import { guestListPath, guestWishPath } from "@/paths";

export const metadata: Metadata = {
  title: "Shared list",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function GuestListPage({
  params,
  searchParams,
}: {
  params: Promise<{ listId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { listId } = await params;
  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  const list = await readGuestList(listId, token);
  if (!list) notFound();
  const { wishes, page, hasNextPage } = await readGuestWishes(
    listId,
    token,
    (await searchParams).page,
  );
  return (
    <section className={styles.page}>
      <p className={styles.notice}>
        Guest view · Read only. This link does not allow editing, joining, or
        reserving.
      </p>
      <h1>{list.title}</h1>
      <MediaImage image={list.image} guestListId={listId} />
      {list.description && (
        <p className={styles.description}>{list.description}</p>
      )}
      <h2>Available wishes</h2>
      {wishes.length ? (
        <ul className={styles["list-grid"]}>
          {wishes.map((wish) => (
            <li key={wish.id} className={styles["list-card"]}>
              <CardMedia image={wish.image} guestListId={listId} />
              <h3>
                <a href={guestWishPath(listId, wish.id)}>{wish.title}</a>
              </h3>
              <p>{formatWishPrice(wish.priceMinor, wish.currency)}</p>
              <WishPriority priority={wish.priority} />
            </li>
          ))}
        </ul>
      ) : (
        <p>No wishes available on this page.</p>
      )}
      {(page > 1 || hasNextPage) && (
        <nav className={styles.actions} aria-label="Guest wish pages">
          {page > 1 && (
            <a href={`${guestListPath(listId)}?page=${page - 1}`}>
              Previous page
            </a>
          )}
          <span>Page {page}</span>
          {hasNextPage && (
            <a href={`${guestListPath(listId)}?page=${page + 1}`}>Next page</a>
          )}
        </nav>
      )}
    </section>
  );
}
