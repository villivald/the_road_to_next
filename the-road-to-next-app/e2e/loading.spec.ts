import { expect, test } from "@playwright/test";
import { accounts, resetFixtures, testPrisma } from "./seed";

test.beforeEach(async () => {
  await resetFixtures();
  const prisma = testPrisma();
  try {
    await prisma.wishlist.create({
      data: {
        id: "e2e-loading-list",
        title: "Loading test list",
        ownerId: "e2e-owner",
        publication: "PUBLISHED",
        memberships: { create: { userId: "e2e-owner", role: "ADMIN" } },
        wishes: { create: { id: "e2e-loading-wish", title: "A little gift" } },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
});

test("Wishlist navigation keeps My lists in place without a homepage redirect", async ({
  page,
}) => {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(accounts.owner.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(accounts.owner.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/lists$/);
  const heading = page.getByRole("heading", { name: "My lists", exact: true });
  await expect(heading).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Loading test list", exact: true }),
  ).toBeVisible();
  const originalHeading = await heading.elementHandle();
  const position = await heading.boundingBox();
  const brand = page.getByRole("banner").getByRole("link", {
    name: "Wishlist",
    exact: true,
  });

  await expect(brand).toHaveAttribute("href", "/en/lists");
  const footerBrand = page.getByRole("contentinfo").getByRole("link", {
    name: "Wishlist",
    exact: true,
  });
  await expect(footerBrand).toHaveAttribute("href", "/en/lists");
  await brand.click();
  await expect(page).toHaveURL(/\/lists$/);
  await expect(heading).toBeVisible();
  expect(
    await originalHeading!.evaluate((element) => element.isConnected),
  ).toBe(true);
  expect(await heading.boundingBox()).toEqual(position);
  await expect(page.locator("[data-loading-preview]")).not.toBeVisible();

  await page.getByRole("link", { name: "Browse", exact: true }).click();
  await expect(page).toHaveURL(/\/browse$/);
  await brand.click();
  await expect(page).toHaveURL(/\/lists$/);
  await expect(heading).toBeVisible();

  await page.goto("/en/browse");
  await footerBrand.click();
  await expect(page).toHaveURL(/\/lists$/);
  await expect(heading).toBeVisible();
});

test("reservations keep heading and empty-page geometry when loading finishes", async ({
  page,
  browser,
}) => {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(accounts.owner.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(accounts.owner.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/lists$/);
  const context = await browser.newContext({
    javaScriptEnabled: false,
    storageState: await page.context().storageState(),
    viewport: page.viewportSize(),
    reducedMotion: "reduce",
  });
  try {
    const previewPage = await context.newPage();
    await previewPage.goto(new URL("/en/reservations", page.url()).href);
    await expect(previewPage.locator("[data-loading-preview]")).toBeVisible();
    await previewPage.evaluate(() => document.fonts.ready);
    const previewHeading = previewPage.getByRole("main").locator("h1");
    const headingBounds = await previewHeading.boundingBox();
    const descriptionBounds = await previewHeading
      .locator("..")
      .locator("p")
      .boundingBox();
    const footerBounds = await previewPage
      .getByRole("contentinfo")
      .boundingBox();

    for (const path of ["/en/lists", "/en/browse", "/en/account/profile"]) {
      await page.goto(path);
      await page
        .getByRole("link", { name: "My reservations", exact: true })
        .click();
      await expect(
        page.getByRole("heading", {
          name: "No active reservations",
          exact: true,
        }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const heading = page.getByRole("heading", {
        name: "My reservations",
        exact: true,
      });
      expect(await heading.boundingBox()).toEqual(headingBounds);
      expect(await heading.locator("..").locator("p").boundingBox()).toEqual(
        descriptionBounds,
      );
      expect(await page.getByRole("contentinfo").boundingBox()).toEqual(
        footerBounds,
      );
    }
  } finally {
    await context.close();
  }
});

test("streamed loading previews reserve space, hide decorative content and respect reduced motion", async ({
  page,
  browser,
}, info) => {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(accounts.owner.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(accounts.owner.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/lists$/);
  // Prevent React from replacing the streamed fallback so its real HTML/CSS can be inspected.
  const context = await browser.newContext({
    javaScriptEnabled: false,
    storageState: await page.context().storageState(),
    viewport: page.viewportSize(),
    reducedMotion: "reduce",
  });
  try {
    const previewPage = await context.newPage();
    for (const path of [
      "/en/browse",
      "/en/lists",
      "/en/lists/shared",
      "/en/reservations",
      "/en/account/profile",
      "/en/lists/e2e-loading-list",
      "/en/lists/e2e-loading-list/edit",
      "/en/lists/e2e-loading-list/sharing",
      "/en/lists/e2e-loading-list/guest-links",
      "/en/lists/e2e-loading-list/wishes/e2e-loading-wish",
    ]) {
      await previewPage.goto(new URL(path, page.url()).href);
      const preview = previewPage.locator("[data-loading-preview]").first();
      await expect(preview).toBeVisible();
      const expectedHeading = path.endsWith("/shared")
        ? "Lists you’ve joined"
        : path.endsWith("/edit")
          ? "List settings"
          : path.endsWith("/sharing")
            ? "Sharing and members"
            : path.endsWith("/guest-links")
              ? "Guest links"
              : null;
      if (expectedHeading) {
        const previewHeading = preview.locator("h1");
        // Without JavaScript, nested routes can remain on the parent fallback.
        const parentFallback =
          (path.endsWith("/sharing") ||
            path.endsWith("/guest-links") ||
            path.endsWith("/edit")) &&
          (await previewHeading.count()) === 0;
        if (parentFallback) {
          await expect(preview.getByRole("status")).toHaveText(
            "Loading editor…",
          );
        } else {
          await expect(previewHeading).toHaveText(expectedHeading);
        }
        await previewPage.evaluate(() => document.fonts.ready);
        const previewBounds = parentFallback
          ? null
          : await previewHeading.boundingBox();
        await page.goto(path);
        const heading = page.getByRole("heading", {
          name: expectedHeading,
          exact: true,
        });
        await expect(heading).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        if (previewBounds) {
          expect(await heading.boundingBox()).toEqual(previewBounds);
        }
        await previewPage.screenshot({
          path: info.outputPath(`${path.split("/").at(-1)}-loading.png`),
          fullPage: true,
        });
      }
      await expect(preview.getByRole("status")).toContainText("Loading");
      await expect(
        preview.locator('[aria-hidden="true"][aria-busy="true"]'),
      ).toHaveCount(1);
      expect((await preview.boundingBox())!.height).toBeGreaterThan(300);
      const animation = await preview
        .locator('[class*="block"]')
        .first()
        .evaluate((element) => getComputedStyle(element).animationName);
      expect(animation).toBe("none");
      expect(
        await previewPage.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (path === "/en/lists") {
        const viewport = previewPage.viewportSize()!;
        await previewPage.setViewportSize({ width: 320, height: 727 });
        await previewPage.evaluate(() => {
          document.documentElement.style.fontSize = "200%";
        });
        expect(
          await previewPage.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await previewPage.evaluate(() => {
          document.documentElement.style.removeProperty("font-size");
        });
        await previewPage.setViewportSize(viewport);
      }
      if (path === "/en/browse" || path === "/en/account/profile") {
        await previewPage.screenshot({
          path: info.outputPath(
            path === "/en/browse"
              ? "browse-loading.png"
              : "profile-loading.png",
          ),
          fullPage: true,
        });
      }
    }
  } finally {
    await context.close();
  }
});
