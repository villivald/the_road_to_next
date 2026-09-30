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
