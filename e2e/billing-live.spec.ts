import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import { emptyPaddleState, livePaddleEnvironment } from "./paddle-fixture";
import { readPaddleState, writePaddleState } from "./paddle-state";
import { accounts, resetFixtures } from "./seed";

for (const locale of ["en", "fi"] as const) {
  test(`public policies are reachable and accessible in ${locale}`, async ({
    page,
  }, testInfo) => {
    const messages = createRequire(import.meta.url)(
      `../src/i18n/messages/${locale}.json`,
    ) as Record<string, string>;
    const title = messages["Refunds and cancellations"];
    await page.addInitScript(
      (theme) => localStorage.setItem("theme", theme),
      locale === "fi" ? "dark" : "light",
    );
    await page.goto(`/${locale}`);
    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: title, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/refunds$`));
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: messages["Paddle Refund Policy"],
        exact: true,
      }),
    ).toHaveAttribute("href", "https://www.paddle.com/legal/refund-policy");
    await expect(
      page
        .locator("article")
        .getByRole("link", { name: "support@wishlist.fi", exact: true }),
    ).toHaveAttribute("href", "mailto:support@wishlist.fi");
    const viewport = page.viewportSize() ?? { width: 1280, height: 800 };
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const [path, heading] of [
      ["refunds", "Refunds and cancellations"],
      ["privacy", "Privacy and your data"],
      ["terms", "Terms of use"],
    ] as const) {
      if (path !== "refunds") {
        await page.setViewportSize(viewport);
        await page.goto(`/${locale}/${path}`);
        await expect(
          page.getByText(
            messages["Service operator: {name}."].replace(
              "{name}",
              "Fixture Operator",
            ),
            { exact: false },
          ),
        ).toBeVisible();
      }
      await expect(
        page.getByRole("heading", { name: messages[heading], exact: true }),
      ).toBeVisible();
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: `.local/billing-live/2026-10-30/${path}-${locale}-${testInfo.project.name}.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 320, height: 760 });
      await page.addStyleTag({ content: "html { font-size: 200%; }" });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });

  test(`live-mode checkout uses the live token and trusted customer in ${locale}`, async ({
    page,
  }) => {
    const messages = createRequire(import.meta.url)(
      `../src/i18n/messages/${locale}.json`,
    ) as Record<string, string>;
    const t = (key: string) => messages[key];
    await resetFixtures();
    await writePaddleState({
      ...emptyPaddleState(),
      idNamespace: "l",
      environment: livePaddleEnvironment,
    });
    await page.addInitScript(
      (theme) => localStorage.setItem("theme", theme),
      locale === "fi" ? "dark" : "light",
    );
    await page.route("https://cdn.paddle.com/paddle/v2/paddle.js", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `window.Paddle={Environment:{set:value=>document.body.dataset.paddleEnvironment=value},Initialize:options=>{document.body.dataset.paddleToken=options.token;document.body.dataset.paddleCustomer=options.pwCustomer.id;document.body.dataset.paddleInitializations=String(Number(document.body.dataset.paddleInitializations||0)+1)},Update:options=>{document.body.dataset.paddleCustomer=options.pwCustomer.id;document.body.dataset.paddleUpdates='true'},Checkout:{open:()=>document.body.dataset.checkoutOpened='true'}};`,
      }),
    );
    await page.goto(`/${locale}/sign-in`);
    await page
      .getByLabel(t("Email"), { exact: true })
      .fill(accounts.owner.email);
    await page
      .getByLabel(t("Password"), { exact: true })
      .fill(accounts.owner.password);
    await page.getByRole("button", { name: t("Sign in"), exact: true }).click();
    await expect(page).toHaveURL(/\/lists$/);
    await page.goto(`/${locale}/account/plan`);
    const offer = page.getByRole("article").filter({
      has: page.getByRole("heading", { name: t("Monthly"), exact: true }),
    });
    await offer.getByRole("checkbox").check();
    await offer.getByRole("button").click();
    await expect(
      page.getByRole("heading", { name: t("Premium checkout"), exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        t(
          "Sandbox · Use Paddle test payment details only. No real money is charged.",
        ),
        { exact: true },
      ),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: t("Open secure checkout"), exact: true })
      .click();
    await expect(page.locator("body")).toHaveAttribute(
      "data-checkout-opened",
      "true",
    );
    await expect(page.locator("body")).toHaveAttribute(
      "data-paddle-token",
      livePaddleEnvironment.PADDLE_CLIENT_TOKEN,
    );
    const state = await readPaddleState();
    await expect(page.locator("body")).toHaveAttribute(
      "data-paddle-customer",
      state.customers[0].id,
    );
    expect(
      await page.locator("body").getAttribute("data-paddle-environment"),
    ).toBeNull();
    await expect(page.locator("body")).toHaveAttribute(
      "data-paddle-initializations",
      "1",
    );
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
        .violations,
    ).toEqual([]);
    await page.setViewportSize({ width: 320, height: 760 });
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("link", { name: t("Back to your plan"), exact: true })
      .click();
    await page
      .getByRole("link", { name: t("Resume checkout"), exact: true })
      .click();
    await expect(page.locator("body")).toHaveAttribute(
      "data-paddle-updates",
      "true",
    );
    await expect(page.locator("body")).toHaveAttribute(
      "data-paddle-initializations",
      "1",
    );
  });
}
