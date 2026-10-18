import {
  CatalogueListCard,
  CataloguePersonCard,
  CatalogueWishCard,
} from "@/components/cards/catalogue-cards";
import styles from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";
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

export function DiscoveryResults({
  result,
  canFavorite = false,
  favoriteIds = [],
}: {
  result: Results;
  canFavorite?: boolean;
  favoriteIds?: string[];
}) {
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
            <CatalogueListCard
              key={list.id}
              list={list}
              favorite={
                canFavorite
                  ? {
                      kind: "list",
                      targetId: list.id,
                      saved: favoriteIds.includes(list.id),
                    }
                  : undefined
              }
            />
          ))
        : "wishes" in result
          ? result.wishes.map((wish) => (
              <CatalogueWishCard
                key={wish.id}
                wish={wish}
                favorite={
                  canFavorite
                    ? {
                        kind: "wish",
                        targetId: wish.id,
                        saved: favoriteIds.includes(wish.id),
                      }
                    : undefined
                }
              />
            ))
          : result.users.map((user) => (
              <CataloguePersonCard
                key={user.username}
                user={user}
                favorite={
                  canFavorite
                    ? {
                        kind: "person",
                        targetId: user.username,
                        saved: favoriteIds.includes(user.username),
                      }
                    : undefined
                }
              />
            ))}
    </ul>
  );
}
