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
import { localizedPath } from "@/i18n/config";
import { getText } from "@/i18n/server";
import { guestListPath, guestWishPath } from "@/paths";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getText();
  return {
    title: t("Shared list"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function GuestListPage({
  params,
  searchParams,
}: {
  params: Promise<{ listId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getText();

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
        {t(
          "Guest view · Read only. This link does not allow editing, joining, or reserving.",
        )}
      </p>
      <h1>{list.title}</h1>
      <MediaImage image={list.image} guestListId={listId} />
      {list.description && (
        <p className={styles.description}>{list.description}</p>
      )}
      <h2>{t("Available wishes")}</h2>
      {wishes.length ? (
        <ul className={styles["list-grid"]}>
          {wishes.map((wish) => (
            <li key={wish.id} className={styles["list-card"]}>
              <CardMedia image={wish.image} guestListId={listId} />
              <h3>
                <a
                  href={localizedPath(guestWishPath(listId, wish.id), t.locale)}
                >
                  {wish.title}
                </a>
              </h3>
              <p>{formatWishPrice(wish.priceMinor, wish.currency, t.locale)}</p>
              <WishPriority priority={wish.priority} />
            </li>
          ))}
        </ul>
      ) : (
        <p>{t("No wishes available on this page.")}</p>
      )}
      {(page > 1 || hasNextPage) && (
        <nav className={styles.actions} aria-label={t("Guest wish pages")}>
          {page > 1 && (
            <a
              href={localizedPath(
                `${guestListPath(listId)}?page=${page - 1}`,
                t.locale,
              )}
            >
              {t("Previous page")}
            </a>
          )}
          <span>
            {t("Page")} {page}
          </span>
          {hasNextPage && (
            <a
              href={localizedPath(
                `${guestListPath(listId)}?page=${page + 1}`,
                t.locale,
              )}
            >
              {t("Next page")}
            </a>
          )}
        </nav>
      )}
    </section>
  );
}
