import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import styles from "@/components/shell.module.css";
import { GUEST_COOKIE } from "@/features/guest/http";
import { readGuestWish } from "@/features/guest/service/access";
import { MediaImage } from "@/features/media/components/media-image";
import { WishPriority } from "@/features/wish/components/wish-priority";
import { formatWishPrice } from "@/features/wish/utils/money";
import { localizedPath } from "@/i18n/config";
import { getText } from "@/i18n/server";
import { guestListPath } from "@/paths";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getText();
  return {
    title: t("Shared wish"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function GuestWishPage({
  params,
}: {
  params: Promise<{ listId: string; wishId: string }>;
}) {
  const t = await getText();

  const { listId, wishId } = await params;
  const wish = await readGuestWish(
    listId,
    wishId,
    (await cookies()).get(GUEST_COOKIE)?.value,
  );
  if (!wish) notFound();
  return (
    <section className={styles.page}>
      <a href={localizedPath(guestListPath(listId), t.locale)}>
        {t("Back to shared list")}
      </a>
      <p className={styles.notice}>{t("Guest view · Read only")}</p>
      <h1>{wish.title}</h1>
      <p>{formatWishPrice(wish.priceMinor, wish.currency, t.locale)}</p>
      <WishPriority priority={wish.priority} />
      <MediaImage image={wish.image} guestListId={listId} />
      {wish.description && (
        <p className={styles.description}>{wish.description}</p>
      )}
      {wish.externalUrl && (
        <a
          href={wish.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
        >
          {t("View product (opens in a new tab)")}
        </a>
      )}
      <p>
        {t(
          "This link does not allow editing, joining, or reserving. Any independent access you have through your account remains available in the normal app.",
        )}
      </p>
    </section>
  );
}
