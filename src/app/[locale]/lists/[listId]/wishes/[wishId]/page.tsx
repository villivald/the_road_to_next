import { Check, Eye, EyeOff, RotateCcw, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WishStatus } from "@/components/cards/wish-status";
import { ActionForm } from "@/components/form/action-form";
import styles from "@/components/shell.module.css";
import { getAuth } from "@/features/auth/actions/get-auth";
import { MediaImage } from "@/features/media/components/media-image";
import { ReservationControls } from "@/features/reservation/components/reservation-controls";
import { changeWishState } from "@/features/wish/actions/manage-wish";
import { WishPriority } from "@/features/wish/components/wish-priority";
import { readWish } from "@/features/wish/service/wishes";
import { formatWishPrice } from "@/features/wish/utils/money";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import { listPath, wishPath } from "@/paths";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getText();
  return {
    title: t("Wish"),
    robots: { index: false, follow: false },
  };
}

export default async function WishPage({
  params,
  searchParams,
}: {
  params: Promise<{ listId: string; wishId: string }>;
  searchParams: Promise<{ created?: string; saved?: string }>;
}) {
  const t = await getText();

  const { user } = await getAuth();
  const { listId, wishId } = await params;
  const wish = await readWish(listId, wishId, user?.id ?? null);

  if (!wish) {
    notFound();
  }

  const { created, saved } = await searchParams;

  return (
    <section className={styles.page}>
      <Link className={styles.description} href={listPath(listId)}>
        {t("Back to")} {wish.wishlist.title}
      </Link>

      {wish.canManage && (created === "1" || saved === "1") && (
        <p role="status" className={styles.notice}>
          {created === "1" ? t("Wish added.") : t("Changes saved.")}
        </p>
      )}

      <div className={styles["page-heading"]}>
        <div>
          <h1>{wish.title}</h1>
          <p className={styles.price}>
            {formatWishPrice(wish.priceMinor, wish.currency, t.locale)}
          </p>
          <WishPriority priority={wish.priority} />
        </div>
        {wish.canManage && (
          <Link
            className={styles.button}
            href={`${wishPath(listId, wishId)}/edit`}
          >
            {t("Edit wish")}
          </Link>
        )}
      </div>

      {(wish.hidden || wish.fulfilledAt || wish.isReserved) && (
        <WishStatus
          hidden={wish.hidden}
          fulfilled={!!wish.fulfilledAt}
          reserved={wish.isReserved}
          reservedByYou={wish.isReservedByYou}
        />
      )}

      <MediaImage image={wish.image} />

      {wish.description && (
        <p className={styles.description}>{wish.description}</p>
      )}

      {wish.externalUrl && (
        <a href={wish.externalUrl} target="_blank" rel="noopener noreferrer">
          {t("View product (opens in a new tab)")}
        </a>
      )}

      <ReservationControls wish={wish} user={user} />

      {wish.canManage && (
        <section
          aria-labelledby="manage-wish-heading"
          className={styles["list-settings"]}
        >
          <h2 id="manage-wish-heading">{t("Manage wish")}</h2>
          <p className={styles.muted}>
            {t(
              "Hidden and fulfilled wishes are only visible to list admins. Hiding or fulfilling a wish ends its active reservation.",
            )}
          </p>

          <div className={styles["wish-controls"]}>
            <ActionForm
              action={changeWishState.bind(null, listId, wishId)}
              label={wish.hidden ? t("Show wish") : t("Hide wish")}
              pendingLabel={t("Updating…")}
              icon={
                wish.hidden ? (
                  <Eye size={18} aria-hidden="true" />
                ) : (
                  <EyeOff size={18} aria-hidden="true" />
                )
              }
            >
              <input
                type="hidden"
                name="transition"
                value={wish.hidden ? "unhide" : "hide"}
              />
            </ActionForm>
            <ActionForm
              action={changeWishState.bind(null, listId, wishId)}
              label={
                wish.fulfilledAt ? t("Reopen wish") : t("Mark as fulfilled")
              }
              pendingLabel={t("Updating…")}
              icon={
                wish.fulfilledAt ? (
                  <RotateCcw size={18} aria-hidden="true" />
                ) : (
                  <Check size={18} aria-hidden="true" />
                )
              }
            >
              <input
                type="hidden"
                name="transition"
                value={wish.fulfilledAt ? "reopen" : "fulfill"}
              />
            </ActionForm>
          </div>

          <Link
            className={styles["icon-label"]}
            href={`${wishPath(listId, wishId)}/delete`}
          >
            <Trash2 size={18} aria-hidden="true" /> {t("Delete wish")}
          </Link>
        </section>
      )}
    </section>
  );
}
