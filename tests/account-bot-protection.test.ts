import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toActionState } from "@/components/form/utils/to-action-state";
import { verifyAccountChallenge } from "@/features/auth/service/bot-protection";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const form = (token = "single-use-token") => {
  const data = new FormData();
  data.set("website", "");
  data.set("cf-turnstile-response", token);
  return data;
};
const verify = (data = form()) => verifyAccountChallenge(data, "sign_up");
const response = (value: unknown) =>
  vi.fn().mockResolvedValue(Response.json(value));

beforeEach(() => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("APP_URL", "https://wishlist.fi");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key-for-tests");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-for-tests");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("account challenge verification", () => {
  it("rejects honeypot submissions before contacting the provider", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const data = form();
    data.set("website", "https://spam.example.test");
    await expect(verify(data)).rejects.toThrow("security check");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", ""],
    ["oversized", "x".repeat(2049)],
  ])("rejects %s tokens", async (_label, token) => {
    vi.stubGlobal("fetch", vi.fn());
    await expect(verify(form(token))).rejects.toThrow("security check");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects duplicate response fields", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const data = form();
    data.append("cf-turnstile-response", "another-token");
    await expect(verify(data)).rejects.toThrow("security check");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    { success: false, hostname: "wishlist.fi", action: "sign_up" },
    { success: true, hostname: "evil.example.test", action: "sign_up" },
    { success: true, hostname: "wishlist.fi", action: "password_recovery" },
    { success: true },
  ])(
    "rejects failed, expired, replayed or mismatched challenges: %j",
    async (value) => {
      vi.stubGlobal("fetch", response(value));
      await expect(verify()).rejects.toThrow("security check");
    },
  );

  it("accepts only provider success for the configured hostname and action", async () => {
    vi.stubGlobal(
      "fetch",
      response({ success: true, hostname: "wishlist.fi", action: "sign_up" }),
    );
    await expect(verify()).resolves.toBeUndefined();
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init).toMatchObject({
      method: "POST",
      cache: "no-store",
      redirect: "error",
    });
    expect(init?.body).toBeInstanceOf(URLSearchParams);
    expect((init?.body as URLSearchParams).get("secret")).toBe(
      "secret-for-tests",
    );
    expect((init?.body as URLSearchParams).has("remoteip")).toBe(false);
  });

  it.each([null, { success: "true" }])(
    "fails closed for malformed provider data: %j",
    async (value) => {
      vi.stubGlobal("fetch", response(value));
      await expect(verify()).rejects.toThrow("temporarily unavailable");
    },
  );

  it("fails closed on an unavailable provider", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("private provider details")),
    );
    await expect(verify()).rejects.toThrow("temporarily unavailable");
    expect(console.error).toHaveBeenCalledWith(
      "Account protection verification unavailable",
    );
  });

  it("fails closed on HTTP errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("error", { status: 503 })),
    );
    await expect(verify()).rejects.toThrow("temporarily unavailable");
  });

  it("requires complete configuration on Vercel, even with no token", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    await expect(verify(new FormData())).rejects.toThrow(
      "temporarily unavailable",
    );
  });

  it("permits only unconfigured local development without a challenge", async () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    await expect(verify(new FormData())).resolves.toBeUndefined();
    vi.stubEnv("TURNSTILE_SECRET_KEY", "partially-configured");
    await expect(verify(new FormData())).rejects.toThrow(
      "temporarily unavailable",
    );
  });

  it("never echoes challenge responses or honeypot values back to the client", () => {
    const data = form();
    data.set("website", "untrusted-value");
    data.set("email", "person@example.test");
    const state = toActionState(
      "ERROR",
      "Please complete the security check and try again.",
      data,
    );
    expect([...state.payload!.keys()]).toEqual(["email"]);
    expect(state.messageCode).toBeDefined();
  });
});
