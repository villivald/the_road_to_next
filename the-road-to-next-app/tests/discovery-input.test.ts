import { describe, expect, it } from "vitest";
import { authReturnPath, safeReturnTo } from "@/features/auth/utils/return-to";
import {
  discoveryUrl,
  parseDiscoveryQuery,
} from "@/features/discovery/service/query";

describe("discovery query bounds", () => {
  it("normalizes unknown options and bounds search and pagination", () => {
    expect(
      parseDiscoveryQuery({ view: "admin", sort: "sql", page: "-1" }),
    ).toMatchObject({ view: "lists", sort: "newest", page: 1 });
    expect(parseDiscoveryQuery({ page: "999999" }).page).toBe(1000);
    expect(parseDiscoveryQuery({ page: "Infinity" }).page).toBe(1);
    expect(parseDiscoveryQuery({ q: "x".repeat(121) })).toMatchObject({
      q: "x".repeat(120),
      error: expect.stringContaining("120"),
    });
    expect(parseDiscoveryQuery({ q: ["first", "second"] }).q).toBe("first");
  });

  it("validates price precision, currency, ranges and zero", () => {
    expect(
      parseDiscoveryQuery({ view: "wishes", sort: "price-low" }).error,
    ).toContain("currency");
    expect(
      parseDiscoveryQuery({
        view: "wishes",
        min: "0",
        max: "19,99",
        currency: "EUR",
      }),
    ).toMatchObject({ minPrice: 0, maxPrice: 1999, error: "" });
    expect(
      parseDiscoveryQuery({
        view: "wishes",
        min: "2",
        max: "1",
        currency: "GBP",
      }).error,
    ).toContain("Minimum");
    expect(
      parseDiscoveryQuery({ view: "wishes", min: "1.005", currency: "USD" })
        .error,
    ).toContain("valid price");
  });

  it("keeps filters in pagination URLs and resets wish-only filters when switching views", () => {
    const filters = parseDiscoveryQuery({
      view: "wishes",
      q: "notebook & pen",
      sort: "price-high",
      currency: "EUR",
      min: "0",
      reservable: "on",
    });
    const url = new URL(discoveryUrl(filters, 2), "http://localhost");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      view: "wishes",
      q: "notebook & pen",
      currency: "EUR",
      min: "0",
      page: "2",
      reservable: "on",
    });
    const lists = new URL(
      discoveryUrl(filters, 1, "lists"),
      "http://localhost",
    );
    expect(lists.searchParams.has("currency")).toBe(false);
    expect(lists.searchParams.has("page")).toBe(false);
  });
});

describe("authentication return paths", () => {
  it.each([
    "/browse",
    "/reservations",
    "/lists",
    "/lists/abc_123",
    "/lists/abc/wishes/def-123",
    "/invitations/abc_123",
  ])("accepts a known local viewing path: %s", (path) => {
    expect(safeReturnTo(path)).toBe(path);
  });

  it.each([
    undefined,
    null,
    ["/browse"],
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "javascript:alert(1)",
    "/lists/a\n",
    "/lists/a\r\nLocation: https://example.com",
    "/lists/%2f%2fevil",
    "/lists/a/../sign-out",
    "/lists/a?redirect=https://example.com",
    "/api/media",
    `/lists/${"a".repeat(129)}`,
    "/invitations/%2f%2fevil",
    "/invitations/a?next=https://evil.test",
    "/invitations/a/accept",
  ])("rejects an unsafe or unknown destination: %s", (path) => {
    expect(safeReturnTo(path)).toBe("/lists");
  });

  it("encodes valid destinations and keeps the default auth route unchanged", () => {
    expect(authReturnPath("/sign-in", "/lists/a/wishes/b")).toBe(
      "/sign-in?returnTo=%2Flists%2Fa%2Fwishes%2Fb",
    );
    expect(authReturnPath("/email-verification", "https://example.com")).toBe(
      "/email-verification",
    );
  });
});
