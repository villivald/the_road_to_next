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
    async (method) => {
      const response = await proxy(
        new NextRequest("http://localhost/en/guest/lists/example", {
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
  it("uses private no-store responses and suppresses referrers for reads", async () => {
    const response = await proxy(
      new NextRequest("http://localhost/en/guest/lists/example"),
    );
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("vercel-cdn-cache-control")).toBe("no-store");
    expect(response.headers.get("x-middleware-request-x-wishlist-view")).toBe(
      "guest",
    );
  });
  it("serves stable guest media URLs without a rewrite loop and rewrites localized aliases", async () => {
    const path = "/guest/lists/example/media/image";
    const legacy = await proxy(new NextRequest(`http://localhost${path}`));
    expect(legacy.headers.get("x-middleware-next")).toBe("1");
    expect(legacy.headers.get("x-middleware-rewrite")).toBeNull();
    for (const locale of ["en", "fi"]) {
      const response = await proxy(
        new NextRequest(`http://localhost/${locale}${path}`),
      );
      expect(response.headers.get("x-middleware-rewrite")).toBe(
        `http://localhost${path}`,
      );
      expect(response.headers.get("cache-control")).toContain("no-store");
    }
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
