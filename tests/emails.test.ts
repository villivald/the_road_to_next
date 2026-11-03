import { createElement } from "react";
import { render } from "react-email";
import { afterEach, expect, it, vi } from "vitest";
import PremiumEmail from "@/emails/account/premium";
import WelcomeEmail from "@/emails/account/welcome";
import EmailVerification from "@/emails/auth/email-verification";
import EmailPasswordReset from "@/emails/password/email-password-reset";
import GroupEmail from "@/emails/reservation/group";
import InvitationAcceptedEmail from "@/emails/sharing/accepted";
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
      ...(["month", "year", "promo"] as const).map((source) =>
        createElement(PremiumEmail, {
          toName: "Demo",
          locale,
          source,
          startsAt: "2026-10-14T12:00:00Z",
          expiresAt: "2026-11-14T12:00:00Z",
        }),
      ),
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
      createElement(InvitationAcceptedEmail, {
        username: "<script>private name</script>",
        locale,
        url: `https://wishlist.example/${locale}/lists/example/sharing`,
      }),
      createElement(InvitationEmail, {
        locale,
        url: `https://wishlist.example/${locale}/invitations/example`,
      }),
      ...(["INVITED", "ACCEPTED"] as const).map((kind) =>
        createElement(GroupEmail, {
          kind,
          actorName: "<script>private name</script>",
          locale,
          url: `https://wishlist.example/${locale}/reservations/example`,
        }),
      ),
    ];
    for (const email of emails) {
      const html = await render(email);
      const plain = await render(email, { plainText: true });
      expect(html).not.toContain("<script>");
      expect(html).toContain(`lang="${locale}"`);
      expect(html).toContain(`<div lang="${locale}" dir="ltr" role="main">`);
      expect(html).toMatch(/<title>[^<]+<\/title>/);
      expect(html.match(/<title>/g)).toHaveLength(1);
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(html).not.toMatch(/<table(?![^>]*role="presentation")/);
      expect(html).toContain('src="https://wishlist.example/email-brand.png"');
      expect(html).toContain("#faf8f0");
      expect(html).toContain("#ffd803");
      expect(html).toContain(`href="https://wishlist.example/${locale}/about"`);
      expect(plain).not.toContain("<table");
      expect(Buffer.byteLength(html)).toBeLessThan(100_000);
      expect(plain.length).toBeGreaterThan(100);
      expect(plain).not.toContain("Show list");
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
    expect(promo).toContain(
      locale === "fi"
        ? "eikä siirrä sen seuraavaa maksua"
        : "or delay its next payment",
    );
    expect(paid).toContain(
      locale === "fi"
        ? "ei peru tilauksen uusiutumista"
        : "does not cancel renewal",
    );
    for (const message of [promo, paid]) {
      expect(message).toContain(locale === "fi" ? "QR-kortti" : "QR card");
      expect(message).toContain(
        locale === "fi"
          ? "ei anna pääsyä rajatulle listalle"
          : "does not grant access to a private list",
      );
    }
  },
);

it.each(["en", "fi"])(
  "explains %s group consent without leaking names into the preheader",
  async (locale) => {
    const props = {
      locale,
      actorName: "Private Person",
      url: `https://wishlist.example/${locale}/reservations/example`,
    };
    const invited = await render(
      createElement(GroupEmail, { ...props, kind: "INVITED" }),
    );
    const accepted = await render(
      createElement(GroupEmail, { ...props, kind: "ACCEPTED" }),
      { plainText: true },
    );
    expect(invited).toContain(
      locale === "fi"
        ? "jaat nimesi ja käyttäjänimesi ryhmälle"
        : "shares your name and username with the group",
    );
    expect(invited).toContain(
      locale === "fi"
        ? "ei anna pääsyä rajatulle listalle"
        : "does not grant access to a private list",
    );
    expect(invited.indexOf("Private Person")).toBeGreaterThan(
      invited.indexOf("</h1>"),
    );
    expect(accepted).toContain(locale === "fi" ? "hyväksyi" : "accepted");
    expect(accepted).not.toContain(
      locale === "fi" ? "Tarkista kutsu" : "Review invitation",
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
