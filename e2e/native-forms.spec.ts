import { expect, test } from "@playwright/test";
import { testEnvironment, testOrigin } from "./environment";
import { accounts, resetFixtures, testPrisma } from "./seed";

test.use({ javaScriptEnabled: false });

test.beforeEach(async () => {
  await resetFixtures();
  const response = await fetch(
    `${testEnvironment.MAILPIT_URL}/api/v1/messages`,
    { method: "DELETE" },
  );
  expect(response.ok).toBe(true);
});

for (const locale of ["en", "fi"] as const) {
  test(`${locale}: native recovery posts preserve their origin without referrer paths`, async ({
    page,
  }) => {
    const prisma = testPrisma();
    try {
      await prisma.user.update({
        where: { id: "e2e-owner" },
        data: { locale },
      });
    } finally {
      await prisma.$disconnect();
    }

    const path = `/${locale}/password-forgot`;
    await page.goto(path);
    await page
      .getByLabel(locale === "fi" ? "Sähköposti" : "Email", { exact: true })
      .fill(accounts.owner.email);
    const posted = page.waitForResponse(
      (response) =>
        response.url() === `${testOrigin}${path}` &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", {
        name: locale === "fi" ? "Lähetä palautuslinkki" : "Send reset link",
      })
      .click();

    const response = await posted;
    expect(response.request().headers().origin).toBe(testOrigin);
    expect(response.request().headers().referer).toBe(`${testOrigin}/`);
    expect(response.status()).toBe(200);
    await expect(page.getByRole("status")).toContainText(
      locale === "fi"
        ? "Jos sähköpostilla on tili, saat palautuslinkin."
        : "If an account matches that email, you will receive a reset link.",
    );

    const mailResponse = await fetch(
      `${testEnvironment.MAILPIT_URL}/api/v1/message/latest`,
    );
    expect(mailResponse.ok).toBe(true);
    const message = (await mailResponse.json()) as {
      Text: string;
      To: { Address: string }[];
    };
    expect(message.To[0]?.Address).toBe(accounts.owner.email);
    expect(message.Text).toContain(`${testOrigin}/${locale}/password-reset/`);

    const body = response.request().postDataBuffer();
    const contentType = response.request().headers()["content-type"];
    if (!body || !contentType) throw new Error("Native post payload missing");
    for (const origin of ["null", "https://untrusted.example.test"]) {
      const rejected = await page.request.post(`${testOrigin}${path}`, {
        headers: { origin, "content-type": contentType },
        data: body,
      });
      expect(rejected.status()).toBeGreaterThanOrEqual(400);
    }
    const messages = await fetch(
      `${testEnvironment.MAILPIT_URL}/api/v1/messages`,
    );
    expect((await messages.json()).total).toBe(1);
  });
}
