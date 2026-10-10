import { createElement } from "react";
import { render } from "react-email";
import { expect, it } from "vitest";
import EmailVerification from "@/emails/auth/email-verification";
import EmailPasswordReset from "@/emails/password/email-password-reset";

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
