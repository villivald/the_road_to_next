import { createElement } from "react";
import { render } from "react-email";
import { afterEach, expect, it, vi } from "vitest";
import PremiumEmail from "@/emails/account/premium";
import WelcomeEmail from "@/emails/account/welcome";
import EmailVerification from "@/emails/auth/email-verification";
import EmailPasswordReset from "@/emails/password/email-password-reset";
import InvitationEmail from "@/emails/sharing/invitation";

afterEach(() => vi.unstubAllEnvs());

it.each(["en", "fi"])(
  "renders all %s emails with the shared brand, usable links, and a plain-text alternative",
  async (locale) => {
    vi.stubEnv("APP_URL", "https://wishlist.example");
    const emails = [
      createElement(WelcomeEmail, {
        toName: "<script>private name</script>",
        locale,
      }),
      createElement(PremiumEmail, {
        toName: "Demo",
        locale,
        source: "month",
        startsAt: "2026-10-14T12:00:00Z",
        expiresAt: "2026-11-14T12:00:00Z",
      }),
      createElement(EmailVerification, {
        toName: "Demo",
        locale,
        code: "ABCDEFGH",
      }),
      createElement(EmailPasswordReset, {
        toName: "Demo",
        locale,
        url: `https://wishlist.example/${locale}/password-reset/token`,
      }),
      createElement(InvitationEmail, {
        locale,
        url: `https://wishlist.example/${locale}/invitations/example`,
      }),
    ];
    for (const email of emails) {
      const html = await render(email);
      const plain = await render(email, { plainText: true });
      expect(html).toContain(`lang="${locale}"`);
      expect(html).toContain('src="https://wishlist.example/email-brand.png"');
      expect(html).toContain("#faf8f0");
      expect(html).toContain("#ffd803");
      expect(html).toContain(`href="https://wishlist.example/${locale}/about"`);
      expect(plain).not.toContain("<table");
      expect(Buffer.byteLength(html)).toBeLessThan(100_000);
    }
    const welcome = await render(emails[0]);
    expect(welcome).not.toContain("<script>");
    expect(welcome).toContain("&lt;script&gt;");
    expect(welcome).toContain(
      `href="https://wishlist.example/${locale}/lists/new"`,
    );
    expect(welcome).toContain(
      `href="https://wishlist.example/${locale}/reservations"`,
    );
  },
);

it.each(["en", "fi"])(
  "distinguishes %s paid subscriptions from future promo access",
  async (locale) => {
    vi.stubEnv("APP_URL", "https://wishlist.example");
    const props = {
      toName: "Demo",
      locale,
      startsAt: "2026-11-14T12:00:00Z",
      expiresAt: "2026-12-14T12:00:00Z",
    };
    const promo = await render(
      createElement(PremiumEmail, { ...props, source: "promo" }),
      { plainText: true },
    );
    const paid = await render(
      createElement(PremiumEmail, { ...props, source: "year" }),
      { plainText: true },
    );
    expect(promo).toContain(
      locale === "fi"
        ? "ei uusiudu automaattisesti"
        : "does not renew automatically",
    );
    expect(promo).toContain(
      locale === "fi" ? "voi alkaa myöhemmin" : "may start later",
    );
    expect(promo).not.toContain(
      locale === "fi" ? "Maksu vahvistettu." : "Payment confirmed.",
    );
    expect(paid).toContain(
      locale === "fi" ? "Maksu vahvistettu." : "Payment confirmed.",
    );
    expect(paid).toContain(
      locale === "fi" ? "Hallitse tilausta" : "Manage subscription",
    );
  },
);

it("renders verification codes", async () => {
  const html = await render(
    createElement(EmailVerification, { toName: "Demo", code: "ABCDEFGH" }),
  );

  expect(html).toContain("ABCDEFGH");
});
it("renders password recovery links", async () => {
  const html = await render(
    createElement(EmailPasswordReset, {
      toName: "Demo",
      url: "https://example.com/password-reset/token",
    }),
  );
  expect(html).toContain('href="https://example.com/password-reset/token"');
});

it("renders Finnish verification and recovery messages without translating user names or secrets", async () => {
  const verification = await render(
    createElement(EmailVerification, {
      toName: "Morning mug",
      code: "ABCDEFGH",
      locale: "fi",
    }),
  );
  expect(verification).toContain('lang="fi"');
  expect(verification).toContain("Morning mug");
  expect(verification).toContain("ABCDEFGH");
  expect(verification).toContain("30 minuutissa");
  expect(verification).not.toContain("This code expires");
  const recovery = await render(
    createElement(EmailPasswordReset, {
      toName: "Demo",
      url: "https://example.com/fi/password-reset/token",
      locale: "fi",
    }),
  );
  expect(recovery).toContain("Palauta salasana");
  expect(recovery).toContain(
    'href="https://example.com/fi/password-reset/token"',
  );
  expect(recovery).toContain("toimii vain kerran");
});
