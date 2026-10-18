import { describe, expect, it } from "vitest";
import { safeReturnTo } from "@/features/auth/utils/return-to";
import {
  favoriteInput,
  parseFavoritesQuery,
} from "@/features/favorites/service/schemas";

describe("favorites input boundaries", () => {
  it("requires an explicit desired state and a valid target", () => {
    for (const input of [
      { kind: "guest", targetId: "wish", saved: true },
      { kind: "wish", targetId: "", saved: true },
      { kind: "wish", targetId: "../private", saved: true },
      { kind: "wish", targetId: "wish", saved: "false" },
    ])
      expect(favoriteInput.safeParse(input).success).toBe(false);
  });
  it("bounds page sizes and allows only the favorites viewing route as a login destination", () => {
    expect(parseFavoritesQuery({ view: "people", page: "9999" })).toEqual({
      view: "people",
      page: 1000,
    });
    expect(parseFavoritesQuery({ view: "private", page: "Infinity" })).toEqual({
      view: "lists",
      page: 1,
    });
    expect(safeReturnTo("/fi/favorites")).toBe("/fi/favorites");
    expect(safeReturnTo("/fi/favorites?next=evil")).toBe("/lists");
  });
});
