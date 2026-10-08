import { afterEach, describe, expect, it, vi } from "vitest";
import { getBaseUrl } from "@/utils/url";

const database = vi.hoisted(() => ({
  session: { findUnique: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: database }));
import { validateSession } from "@/lib/lucia";

afterEach(() => vi.unstubAllEnvs());

describe("session privacy and expiry", () => {
  it("selects only public user fields for client-facing auth", async () => {
    const user = {
      id: "user-1",
      username: "demo",
      email: "demo@example.com",
      emailVerified: true,
    };
    database.session.findUnique.mockResolvedValue({
      id: "hashed-token",
      userId: user.id,
      expiresAt: new Date(Date.now() + 29 * 86400000),
      user,
    });
    const result = await validateSession("token");
    expect(result.user).toEqual(user);
    expect(database.session.findUnique.mock.calls[0][0].include.user).toEqual({
      select: {
        id: true,
        username: true,
        email: true,
        emailVerified: true,
        locale: true,
      },
    });
  });
  it("rejects expired sessions even if a concurrent request removed them", async () => {
    database.session.findUnique.mockResolvedValue({
      id: "expired",
      userId: "user-1",
      expiresAt: new Date(0),
      user: { id: "user-1" },
    });
    database.session.deleteMany.mockResolvedValue({ count: 0 });
    expect(await validateSession("expired")).toEqual({
      user: null,
      session: null,
    });
  });
});

describe("generated links", () => {
  it("uses the configured origin for email links", () => {
    vi.stubEnv("APP_URL", "https://tickets.example.com/");
    expect(getBaseUrl()).toBe("https://tickets.example.com");
  });
  it("uses HTTPS on Vercel and localhost for local production previews", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "tickets.example.com");
    expect(getBaseUrl()).toBe("https://tickets.example.com");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    expect(getBaseUrl()).toBe("http://localhost:3000");
  });
});

describe("form response privacy", () => {
  it("never returns submitted passwords to the client", async () => {
    const { toActionState, fromErrorToActionState } =
      await import("@/components/form/utils/to-action-state");
    const data = new FormData();
    data.set("email", "demo@example.com");
    data.set("password", "private-password");
    data.set("confirmPassword", "private-password");
    for (const state of [
      toActionState("ERROR", "Invalid credentials", data),
      fromErrorToActionState(new Error("Failed"), data),
    ]) {
      expect(state.payload?.get("email")).toBe("demo@example.com");
      expect(state.payload?.has("password")).toBe(false);
      expect(state.payload?.has("confirmPassword")).toBe(false);
    }
  });
});
