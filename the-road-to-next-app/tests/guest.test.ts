import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import {
  guestLinkSchema,
  guestTokenSchema,
} from "@/features/guest/service/schemas";
import { proxy } from "@/proxy";

describe("guest boundary", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "rejects %s before a guest page can execute a server action",
    (method) => {
      const response = proxy(
        new NextRequest("http://localhost/guest/lists/example", {
          method,
          headers: {
            "next-action": "forged-action",
            cookie: "session=existing-account",
          },
        }),
      );
      expect(response.status).toBe(405);
      expect(response.headers.get("cache-control")).toContain("no-store");
    },
  );
  it("uses private no-store responses and suppresses referrers for reads", () => {
    const response = proxy(
      new NextRequest("http://localhost/guest/lists/example"),
    );
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("vercel-cdn-cache-control")).toBe("no-store");
    expect(response.headers.get("x-middleware-request-x-wishlist-view")).toBe(
      "guest",
    );
  });
  it("bounds link lifetime and rejects URL-encoded or malformed token inputs", () => {
    expect(guestLinkSchema.parse({ label: " Family ", days: "7" })).toEqual({
      label: "Family",
      days: 7,
    });
    for (const days of [0, 31, 1.5, "forever"])
      expect(guestLinkSchema.safeParse({ label: "Family", days }).success).toBe(
        false,
      );
    for (const token of [
      "",
      "a".repeat(33),
      "%61".repeat(32),
      "A".repeat(32),
      null,
    ])
      expect(guestTokenSchema.safeParse(token).success).toBe(false);
  });
});
