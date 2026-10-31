import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => vi.resetModules());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const load = () => import("@/features/billing/service/webhook-network");
const ranges = (cidrs: string[]) =>
  Response.json({ data: { ipv4_cidrs: cidrs } });

it("matches IPv4 CIDRs and rejects invalid, IPv6 and forged chains", async () => {
  const { matchesPaddleRange } = await load();
  expect(matchesPaddleRange("192.0.2.5", ["192.0.2.5/32"])).toBe(true);
  expect(matchesPaddleRange("192.0.2.6", ["192.0.2.5/32"])).toBe(false);
  expect(matchesPaddleRange("192.0.2.255", ["192.0.2.0/24"])).toBe(true);
  for (const value of ["192.0.3.1", "192.0.2.5, 1.1.1.1", "::1", "999.1.1.1"])
    expect(matchesPaddleRange(value, ["192.0.2.0/24"])).toBe(false);
  expect(
    matchesPaddleRange("192.0.2.5", [
      "0.0.0.0/0",
      "192.0.2.0/33",
      "192.0.2.5/32/",
    ]),
  ).toBe(false);
});

it("deduplicates fetches, keeps environments separate and refreshes expired ranges", async () => {
  vi.useFakeTimers();
  const fetch = vi.fn(async (url: string) =>
    ranges([url.includes("sandbox") ? "192.0.2.1/32" : "192.0.2.2/32"]),
  );
  vi.stubGlobal("fetch", fetch);
  const { paddleWebhookRanges } = await load();
  expect(
    await Promise.all([
      paddleWebhookRanges("live"),
      paddleWebhookRanges("live"),
    ]),
  ).toEqual([["192.0.2.2/32"], ["192.0.2.2/32"]]);
  expect(fetch).toHaveBeenCalledTimes(1);
  await paddleWebhookRanges("sandbox");
  await paddleWebhookRanges("live");
  expect(fetch).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(5 * 60_000 + 1);
  fetch.mockImplementation(async () => ranges(["192.0.2.3/32"]));
  expect(await paddleWebhookRanges("live")).toEqual(["192.0.2.3/32"]);
  expect(fetch).toHaveBeenCalledTimes(3);
});

it("fails closed when the published list is invalid or unavailable", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ranges(["untrusted"])),
  );
  const { paddleWebhookRanges } = await load();
  await expect(paddleWebhookRanges("live")).rejects.toThrow();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 503 })),
  );
  await expect(paddleWebhookRanges("live")).rejects.toThrow("unavailable");
});

it("trusts only the Vercel edge source header and the matching environment's ranges", async () => {
  vi.stubEnv("VERCEL", "1");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      ranges([url.includes("sandbox") ? "192.0.2.1/32" : "192.0.2.2/32"]),
    ),
  );
  const { allowedPaddleWebhookSource } = await load();
  const request = (headers: HeadersInit) =>
    new Request("https://wishlist.example/api/paddle/live/webhook", {
      headers,
    });
  expect(
    await allowedPaddleWebhookSource(
      request({ "x-vercel-forwarded-for": "192.0.2.2" }),
      "live",
    ),
  ).toBe(true);
  expect(
    await allowedPaddleWebhookSource(
      request({ "x-vercel-forwarded-for": "192.0.2.1" }),
      "live",
    ),
  ).toBe(false);
  expect(
    await allowedPaddleWebhookSource(
      request({ "x-forwarded-for": "192.0.2.2" }),
      "live",
    ),
  ).toBe(false);
});

it("permits local sandbox fixtures but never bypasses the live edge check", async () => {
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("APP_URL", "http://127.0.0.1:3017");
  const { allowedPaddleWebhookSource } = await load();
  const request = new Request("http://127.0.0.1:3017/api/paddle/webhook");
  expect(await allowedPaddleWebhookSource(request, "sandbox")).toBe(true);
  expect(await allowedPaddleWebhookSource(request, "live")).toBe(false);
  vi.stubEnv("APP_URL", "https://wishlist.example");
  expect(
    await allowedPaddleWebhookSource(
      new Request("https://wishlist.example/api/paddle/webhook"),
      "sandbox",
    ),
  ).toBe(false);
});
