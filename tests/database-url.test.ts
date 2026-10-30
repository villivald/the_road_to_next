import { expect, it } from "vitest";
import { withExplicitNeonTls } from "@/lib/database-url";

const neon =
  "postgresql://fixture:encoded%40password@endpoint-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&schema=wishlist&channel_binding=require";

it("uses explicit hostname-verified TLS while preserving connection parameters", () => {
  const result = new URL(withExplicitNeonTls(neon)!);
  const original = new URL(neon);
  expect(result.searchParams.get("sslmode")).toBe("verify-full");
  original.searchParams.set("sslmode", "verify-full");
  expect(result.toString()).toBe(original.toString());
  expect(withExplicitNeonTls(neon.replace("-pooler", ""))).toContain(
    "sslmode=verify-full",
  );
});

it.each([
  "postgresql://fixture@127.0.0.1:55433/wishlist_test?schema=wishlist",
  "postgresql://fixture@db.example.test/database?sslmode=require",
  neon.replace("sslmode=require", "sslmode=verify-full"),
  `${neon}&uselibpqcompat=true`,
  neon.replace("sslmode=require", "sslmode=disable"),
  "invalid-connection-string",
  undefined,
])("preserves an unrelated or explicitly configured connection: %s", (url) => {
  expect(withExplicitNeonTls(url)).toBe(url);
});
