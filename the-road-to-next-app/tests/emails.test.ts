import { createElement } from "react";
import { render } from "react-email";
import { expect, it } from "vitest";
import EmailVerification from "@/emails/auth/email-verification";
import EmailInvitation from "@/emails/invitation/email-invitation";
import EmailPasswordReset from "@/emails/password/email-password-reset";

it("renders verification codes with React Email 6", async () => {
  const html = await render(
    createElement(EmailVerification, { toName: "Demo", code: "ABCDEFGH" }),
  );
  expect(html).toContain("ABCDEFGH");
});
it("renders invitation links", async () => {
  const html = await render(
    createElement(EmailInvitation, {
      fromUser: "Demo",
      fromOrganization: "Demo Org",
      url: "https://example.com/email-invitation/token",
    }),
  );
  expect(html).toContain('href="https://example.com/email-invitation/token"');
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
