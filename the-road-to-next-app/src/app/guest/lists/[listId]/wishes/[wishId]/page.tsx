import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import styles from "@/components/shell.module.css";
import { GUEST_COOKIE } from "@/features/guest/http";
import { readGuestWish } from "@/features/guest/service/access";
import { MediaImage } from "@/features/media/components/media-image";
import { WishPriority } from "@/features/wish/components/wish-priority";
import { formatWishPrice } from "@/features/wish/utils/money";
import { guestListPath } from "@/paths";

export const metadata: Metadata = {
  title: "Shared wish",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function GuestWishPage({
  params,
}: {
  params: Promise<{ listId: string; wishId: string }>;
}) {
  const { listId, wishId } = await params;
  const wish = await readGuestWish(
    listId,
    wishId,
    (await cookies()).get(GUEST_COOKIE)?.value,
  );
  if (!wish) notFound();
  return (
    <section className={styles.page}>
      <a href={guestListPath(listId)}>Back to shared list</a>
      <p className={styles.notice}>Guest view · Read only</p>
      <h1>{wish.title}</h1>
      <p>{formatWishPrice(wish.priceMinor, wish.currency)}</p>
      <WishPriority priority={wish.priority} />
      <MediaImage image={wish.image} guestListId={listId} />
      <p className={styles.description}>
        {wish.description || "No description added."}
      </p>
      {wish.externalUrl && (
        <a
          href={wish.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
        >
          View product (opens in a new tab)
        </a>
      )}
      <p>
        This link does not allow editing, joining, or reserving. Any independent
        access you have through your account remains available in the normal
        app.
      </p>
    </section>
  );
}
