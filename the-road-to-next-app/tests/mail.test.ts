import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import EmailVerification from "@/emails/auth/email-verification";
import { deliverEmail } from "@/lib/mail";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it.each(["en", "fi"])(
  "sends a %s verification email through the real Resend SDK with a mocked transport",
  async (locale) => {
    vi.stubEnv("MAILPIT_URL", "");
    vi.stubEnv("EMAIL_FROM", "Wishlist <sender@example.test>");
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "test-message" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", transport);

    await expect(
      deliverEmail(
        "recipient@example.test",
        "Verification test",
        createElement(EmailVerification, {
          toName: "Test person",
          code: "ABCDEFGH",
          locale,
        }),
        "verification-test",
      ),
    ).resolves.toEqual({ error: null });

    expect(transport).toHaveBeenCalledTimes(1);
    const [url, request] = transport.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    const payload = JSON.parse(request?.body as string);
    expect(payload).toMatchObject({
      from: "Wishlist <sender@example.test>",
      to: "recipient@example.test",
      subject: "Verification test",
    });
    expect(payload.html).toContain(`lang="${locale}"`);
    expect(payload.html).toContain("ABCDEFGH");
    expect(payload.text).toContain("ABCDEFGH");
    expect(payload.text).toContain(
      locale === "fi" ? "30 minuutissa" : "30 minutes",
    );
    expect(payload).not.toHaveProperty("react");
    expect(new Headers(request?.headers).get("Idempotency-Key")).toBe(
      "verification-test",
    );
  },
);

it("reports a rejected Resend request without logging private content in production", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("MAILPIT_URL", "");
  const transport = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        name: "validation_error",
        statusCode: 403,
        message: "Rejected recipient@example.test and code ABCDEFGH",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    ),
  );
  vi.stubGlobal("fetch", transport);
  const log = vi.spyOn(console, "error").mockImplementation(() => {});

  await expect(
    deliverEmail(
      "recipient@example.test",
      "Verification test",
      createElement("p", null, "ABCDEFGH"),
    ),
  ).rejects.toThrow("Email delivery failed");

  expect(log).toHaveBeenCalledWith("Resend email delivery failed", {
    statusCode: 403,
  });
  expect(JSON.stringify(log.mock.calls)).not.toContain(
    "recipient@example.test",
  );
  expect(JSON.stringify(log.mock.calls)).not.toContain("ABCDEFGH");
});
