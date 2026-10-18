export type FavoriteKind = "list" | "wish" | "person";

export type FavoriteTarget = {
  kind: FavoriteKind;
  targetId: string;
  saved: boolean;
};
