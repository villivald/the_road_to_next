import { describe, expect, it } from "vitest";
import { toActionState } from "@/components/form/utils/to-action-state";
import { safeReturnTo } from "@/features/auth/utils/return-to";
import { formatWishPrice } from "@/features/wish/utils/money";
import { localizedPath, withoutLocale } from "@/i18n/config";
import english from "@/i18n/messages/en.json";
import finnish from "@/i18n/messages/fi.json";
import { createText } from "@/i18n/text";

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("English and Finnish catalogs", () => {
  it("keeps all keys and interpolation parameters aligned", () => {
    expect(Object.keys(finnish).sort()).toEqual(Object.keys(english).sort());
    for (const key of Object.keys(english) as (keyof typeof english)[]) {
      expect(finnish[key].trim(), key).not.toBe("");
      expect(placeholders(finnish[key]), key).toEqual(
        placeholders(english[key]),
      );
      if (key !== "{value0}…") expect(finnish[key], key).not.toBe(english[key]);
    }
  });
  it("renders Finnish plurals, prices, and safe message codes", () => {
    const t = createText("fi");
    expect(t.plural("{count} public list", "{count} public lists", 1)).toBe(
      "1 julkinen lista",
    );
    expect(t.plural("{count} public list", "{count} public lists", 0)).toBe(
      "0 julkista listaa",
    );
    expect(t.plural("{count} public list", "{count} public lists", 2)).toBe(
      "2 julkista listaa",
    );
    expect(formatWishPrice(1250, "EUR", "fi")).toMatch(/12,50\s+EUR/);
    expect(formatWishPrice(null, null, "fi")).toBe("Hintaa ei ole lisätty");
    const state = toActionState("ERROR", "Incorrect email or password");
    expect(state.messageCode).toBeDefined();
    expect(t.feedback({ ...state, message: "presentation text changed" })).toBe(
      "Sähköposti tai salasana on väärä",
    );
    expect(t("View {value0}", { value0: "Private wish" })).toBe(
      "Avaa: Private wish",
    );
  });
});

describe("locale routing security", () => {
  it("preserves queries and fragments without stacking prefixes", () => {
    expect(
      localizedPath("/en/browse?view=wishes&page=2#main-content", "fi"),
    ).toBe("/fi/browse?view=wishes&page=2#main-content");
    expect(localizedPath("/guest#secret", "fi")).toBe("/fi/guest#secret");
    expect(localizedPath("/api/guest", "fi")).toBe("/api/guest");
    expect(withoutLocale("/fi")).toBe("/");
  });
  it("allows both localized and legacy viewing destinations and rejects unsafe ones", () => {
    for (const path of [
      "/en/lists/list-1/wishes/wish-1",
      "/fi/invitations/invite-1",
      "/lists/list-1",
    ])
      expect(safeReturnTo(path)).toBe(path);
    for (const path of [
      "//example.com",
      "/fi//example.com",
      "/fi/\\example.com",
      "/fi/en/lists",
      "/fi/lists?next=evil",
      "/fi/lists/%2f",
      "/sv/lists",
      "/fi/api/guest",
    ])
      expect(safeReturnTo(path)).toBe("/lists");
  });
});
