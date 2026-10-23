import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { limitAccountEmailSource } from "@/features/auth/service/request-limit";
import { prisma } from "@/lib/prisma";
import { assertTestDatabase } from "../e2e/environment";
import { resetFixtures } from "../e2e/seed";

const requestHeaders = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers: requestHeaders }));
assertTestDatabase(process.env);
beforeEach(async () => {
  await resetFixtures();
  vi.stubEnv("VERCEL", "1");
  requestHeaders.mockResolvedValue(
    new Headers({
      "x-vercel-forwarded-for": "192.0.2.10",
      "x-forwarded-for": "203.0.113.99",
    }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
afterAll(() => prisma.$disconnect());

it("limits signup across changing emails and isolates separate trusted source addresses", async () => {
  for (let index = 0; index < 5; index++) await limitAccountEmailSource(true);
  await expect(limitAccountEmailSource(true)).rejects.toThrow(
    "Too many attempts",
  );
  requestHeaders.mockResolvedValue(
    new Headers({ "x-vercel-forwarded-for": "192.0.2.11" }),
  );
  await expect(limitAccountEmailSource(true)).resolves.toBeUndefined();
  expect(JSON.stringify(await prisma.authRateLimit.findMany())).not.toContain(
    "192.0.2.",
  );
});

it("caps signup daily even when 15-minute request windows have reset", async () => {
  const start = Date.UTC(2026, 9, 23, 10);
  const clock = vi.spyOn(Date, "now").mockReturnValue(start);
  for (let window = 0; window < 4; window++) {
    clock.mockReturnValue(start + window * 900_000);
    for (let index = 0; index < 5; index++) await limitAccountEmailSource(true);
  }
  clock.mockReturnValue(start + 4 * 900_000);
  await expect(limitAccountEmailSource(true)).rejects.toThrow(
    "Too many attempts",
  );
  clock.mockReturnValue(start + 86_400_000);
  await expect(limitAccountEmailSource(true)).resolves.toBeUndefined();
});

it("shares the email-request source budget and ignores spoofed proxy headers outside Vercel", async () => {
  vi.stubEnv("VERCEL", "");
  for (let index = 0; index < 20; index++) {
    requestHeaders.mockResolvedValue(
      new Headers({ "x-forwarded-for": `203.0.113.${index}` }),
    );
    await limitAccountEmailSource();
  }
  await expect(limitAccountEmailSource()).rejects.toThrow("Too many attempts");
  expect(requestHeaders).not.toHaveBeenCalled();
});
