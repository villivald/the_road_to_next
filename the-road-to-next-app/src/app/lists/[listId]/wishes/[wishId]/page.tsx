import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/form/action-form";
import styles from "@/components/shell.module.css";
import { getAuth } from "@/features/auth/actions/get-auth";
import { changeWishState } from "@/features/wish/actions/manage-wish";
import { WishPriority } from "@/features/wish/components/wish-priority";
import { readWish } from "@/features/wish/service/wishes";
import { formatWishPrice } from "@/features/wish/utils/money";
import { listPath, wishPath } from "@/paths";

export const metadata: Metadata = {
  title: "Wish",
  robots: { index: false, follow: false },
};

export default async function WishPage({
  params,
  searchParams,
}: {
  params: Promise<{ listId: string; wishId: string }>;
  searchParams: Promise<{ created?: string; saved?: string }>;
}) {
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
        Back to {wish.wishlist.title}
      </Link>

      {wish.canManage && (created === "1" || saved === "1") && (
        <p role="status" className={styles.notice}>
          {created === "1" ? "Wish added." : "Changes saved."}
        </p>
      )}

      <div className={styles["page-heading"]}>
        <div>
          <h1>{wish.title}</h1>
          <p>{formatWishPrice(wish.priceMinor, wish.currency)}</p>
          <WishPriority priority={wish.priority} />
        </div>
        {wish.canManage && (
          <Link
            className={styles.button}
            href={`${wishPath(listId, wishId)}/edit`}
          >
            Edit wish
          </Link>
        )}
      </div>

      {(wish.hidden || wish.fulfilledAt || wish.isReserved) && (
        <div className={styles.actions}>
          {wish.hidden && <p className={styles.notice}>Hidden</p>}
          {wish.fulfilledAt && <p className={styles.notice}>Fulfilled</p>}
          {wish.isReserved && (
            <p className={styles.notice}>
              {wish.isReservedByYou ? "Reserved by you" : "Reserved"}
            </p>
          )}
        </div>
      )}

      <p className={styles.description}>
        {wish.description || "No description added."}
      </p>

      {wish.externalUrl && (
        <a href={wish.externalUrl} target="_blank" rel="noopener noreferrer">
          View product (opens in a new tab)
        </a>
      )}

      {wish.canManage && (
        <section
          aria-labelledby="manage-wish-heading"
          className={styles["list-settings"]}
        >
          <h2 id="manage-wish-heading">Manage wish</h2>
          <p className={styles.muted}>
            Hidden and fulfilled wishes are only visible to list admins. Hiding
            or fulfilling a wish ends its active reservation.
          </p>

          <div className={styles["wish-controls"]}>
            <ActionForm
              action={changeWishState.bind(null, listId, wishId)}
              label={wish.hidden ? "Show wish" : "Hide wish"}
              pendingLabel="Updating…"
            >
              <input
                type="hidden"
                name="transition"
                value={wish.hidden ? "unhide" : "hide"}
              />
            </ActionForm>
            <ActionForm
              action={changeWishState.bind(null, listId, wishId)}
              label={wish.fulfilledAt ? "Reopen wish" : "Mark as fulfilled"}
              pendingLabel="Updating…"
            >
              <input
                type="hidden"
                name="transition"
                value={wish.fulfilledAt ? "reopen" : "fulfill"}
              />
            </ActionForm>
          </div>

          <Link href={`${wishPath(listId, wishId)}/delete`}>Delete wish</Link>
        </section>
      )}
    </section>
  );
}
