import { List } from "lucide-react";
import { CardActions, OwnershipBadge } from "@/components/cards/card-actions";
import {
  CardMedia,
  ListPreview,
  UserAvatar,
} from "@/components/cards/card-media";
import cardStyles from "@/components/cards/cards.module.css";
import { ProfileBio } from "@/components/cards/profile-bio";
import { ReservationAvailability } from "@/components/cards/reservation-availability";
import styles from "@/components/shell.module.css";
import { WishPriority } from "@/features/wish/components/wish-priority";
import { formatWishPrice } from "@/features/wish/utils/money";
import { Link } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import { listPath, listSettingsPath, sharingPath, wishPath } from "@/paths";
import type {
  discoverLists,
  discoverUsers,
  discoverWishes,
} from "../service/discovery";

type Results = Awaited<
  ReturnType<
    typeof discoverLists | typeof discoverWishes | typeof discoverUsers
  >
>;

export function DiscoveryResults({ result }: { result: Results }) {
  const t = useText();

  return (
    <ul
      className={styles["list-grid"]}
      aria-label={
        result.filters.view === "users"
          ? t("People with public lists")
          : result.filters.view === "lists"
            ? t("Public lists")
            : t("Public wishes")
      }
    >
      {"lists" in result
        ? result.lists.map((list) => (
            <li
              className={`${styles["list-card"]} ${cardStyles["browse-card"]}`}
              key={list.id}
            >
              <ListPreview image={list.image} images={list.previewImages} />
              {list.isOwner && <OwnershipBadge edge />}
              <h2>
                <Link href={listPath(list.id)}>{list.title}</Link>
              </h2>
              {list.description && (
                <p className={styles.description}>
                  {list.description.slice(0, 180)}
                  {list.description.length > 180 ? "…" : ""}
                </p>
              )}
              <div className={cardStyles["list-footer"]}>
                <p className={styles["icon-label"]}>
                  <List size={18} aria-hidden="true" />
                  {t.plural(
                    "{count} available wish",
                    "{count} available wishes",
                    list.availableWishCount,
                  )}
                </p>
                <ReservationAvailability enabled={list.reservationsEnabled} />
                <CardActions
                  path={listPath(list.id)}
                  settingsPath={listSettingsPath(list.id)}
                  title={list.title}
                  canCopy
                  canManage={list.isOwner}
                  sharingPath={list.isOwner ? sharingPath(list.id) : undefined}
                />
              </div>
            </li>
          ))
        : "wishes" in result
          ? result.wishes.map((wish) => (
              <li
                className={`${styles["list-card"]} ${cardStyles["browse-card"]}`}
                key={wish.id}
              >
                <CardMedia image={wish.image} />
                {wish.wishlist.isOwner && <OwnershipBadge edge />}
                <h2>
                  <Link href={wishPath(wish.wishlist.id, wish.id)}>
                    {wish.title}
                  </Link>
                </h2>
                <div className={cardStyles["wish-summary"]}>
                  <p className={cardStyles["wish-list"]}>
                    <List size={16} aria-hidden="true" />
                    <Link href={listPath(wish.wishlist.id)}>
                      {wish.wishlist.title}
                    </Link>
                  </p>
                  <div className={cardStyles["wish-facts"]}>
                    <p className={styles.price}>
                      {formatWishPrice(
                        wish.priceMinor,
                        wish.currency,
                        t.locale,
                      )}
                    </p>
                    <WishPriority priority={wish.priority} />
                  </div>
                </div>
                <CardActions
                  path={wishPath(wish.wishlist.id, wish.id)}
                  title={wish.title}
                  canCopy
                  canManage={wish.wishlist.isOwner}
                />
              </li>
            ))
          : result.users.map((user) => (
              <li
                className={`${styles["list-card"]} ${cardStyles["user-card"]}`}
                key={user.username}
              >
                <div className={cardStyles["user-heading"]}>
                  <UserAvatar image={user.image} />
                  {user.isViewer && <OwnershipBadge user />}
                </div>
                <h2>{user.name ?? user.username}</h2>
                <p>
                  {t.plural(
                    "{count} public list",
                    "{count} public lists",
                    user.publicListCount,
                  )}
                </p>
                {user.description && (
                  <ProfileBio
                    text={user.description}
                    name={user.name ?? user.username}
                  />
                )}
                <Link
                  className={styles["secondary-button"]}
                  href={`/browse?${new URLSearchParams({ view: "lists", owner: user.username })}`}
                >
                  {t("View public lists")}
                </Link>
              </li>
            ))}
    </ul>
  );
}
