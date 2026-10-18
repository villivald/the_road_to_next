import {
  CatalogueListCard,
  CataloguePersonCard,
  CatalogueWishCard,
} from "@/components/cards/catalogue-cards";
import shell from "@/components/shell.module.css";
import { getText } from "@/i18n/server";
import type { readFavorites } from "../service/favorites";

export async function FavoritesResults({
  result,
}: {
  result: Awaited<ReturnType<typeof readFavorites>>;
}) {
  const t = await getText();
  return (
    <ul className={shell["list-grid"]} aria-label={t("Saved favorites")}>
      {result.lists?.map((list) => (
        <CatalogueListCard
          key={list.id}
          list={list}
          section="favorites"
          favorite={{ kind: "list", targetId: list.id, saved: true }}
        />
      ))}
      {result.wishes?.map((wish) => (
        <CatalogueWishCard
          key={wish.id}
          wish={wish}
          section="favorites"
          favorite={{ kind: "wish", targetId: wish.id, saved: true }}
        />
      ))}
      {result.people?.map((person) => (
        <CataloguePersonCard
          key={person.username}
          user={person}
          favorite={{ kind: "person", targetId: person.username, saved: true }}
        />
      ))}
    </ul>
  );
}
