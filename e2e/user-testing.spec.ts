import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { accounts, resetFixtures, testPrisma } from "./seed";

const listId = "e2e-session-feedback";
async function signIn(page: Page, owner = false) {
  const account = owner ? accounts.owner : accounts.member;
  await page.goto("/en/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/lists$/);
}

test.beforeEach(async () => {
  await resetFixtures();
  const db = testPrisma();
  try {
    await db.wishlist.create({
      data: {
        id: listId,
        title: "Shared birthday wishes",
        ownerId: "e2e-owner",
        memberships: {
          create: [
            { userId: "e2e-owner", role: "ADMIN" },
            { userId: "e2e-member", role: "MEMBER" },
          ],
        },
        wishes: {
          create: [
            {
              id: "e2e-session-reserved",
              title: "Reserved notebook",
              reservations: { create: { userId: "e2e-member" } },
            },
            { id: "e2e-session-available", title: "Available book" },
          ],
        },
      },
    });
    await db.favoriteList.create({
      data: { userId: "e2e-member", wishlistId: listId },
    });
    await db.favoriteWish.create({
      data: { userId: "e2e-member", wishId: "e2e-session-reserved" },
    });
    await db.favoritePerson.create({
      data: { userId: "e2e-member", personId: "e2e-owner" },
    });
  } finally {
    await db.$disconnect();
  }
});

test("shared toggle combines cards, preserves pagination state and redirects old links", async ({
  page,
}) => {
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: "Shared birthday wishes" }),
  ).toHaveCount(0);
  const toggle = page.getByRole("switch", { name: "Include shared lists" });
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toBeChecked();
  await expect(
    page.getByRole("heading", { name: "Shared birthday wishes" }),
  ).toBeVisible();
  await expect(toggle).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Another person's private list" }),
  ).toBeVisible();
  const card = page.getByRole("listitem").filter({
    has: page.getByRole("heading", { name: "Shared birthday wishes" }),
  });
  await expect(
    card.getByText("1 available wish", { exact: true }),
  ).toBeVisible();
  await expect(card.getByText("1 reserved", { exact: true })).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Leave list", exact: true }),
  ).toBeVisible();
  await toggle.uncheck();
  await expect(
    page.getByRole("heading", { name: "Shared birthday wishes" }),
  ).toHaveCount(0);
  await page.goto("/en/lists/shared");
  await expect(page).toHaveURL(/\/lists\?shared=1/);
  await expect(toggle).toBeChecked();
  await page
    .getByRole("heading", { name: "Shared birthday wishes" })
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(/from=lists/);
  await page
    .getByRole("link", { name: "Back to my lists", exact: true })
    .click();
  await expect(page).toHaveURL(/\/lists\?shared=1/);
  await expect(toggle).toBeChecked();
});

test("reserver sees their marked wish and reserved-only filtering updates immediately", async ({
  page,
  browser,
}) => {
  await signIn(page);
  await page.goto(`/en/lists/${listId}`);
  await expect(page.getByText("@e2e-owner", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Reserved by you", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-reserved="true"]')).toHaveCount(1);
  await page.getByRole("switch", { name: "Only reserved wishes" }).check();
  await expect(
    page.getByRole("heading", { name: "Available book" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Reserved notebook" }),
  ).toBeVisible();
  const visitor = await browser.newPage();
  try {
    await visitor.goto(page.url());
    await expect(
      visitor.getByRole("heading", { name: "Reserved notebook" }),
    ).toHaveCount(0);
    await expect(
      visitor.getByRole("heading", { name: "No reserved wishes" }),
    ).toBeVisible();
  } finally {
    await visitor.close();
  }
});

for (const locale of ["en", "fi"]) {
  test(`${locale} favorites counts, reserved cards and billing separators fit narrow themes and enlarged text`, async ({
    page,
  }, info) => {
    await signIn(page);
    for (const colorScheme of ["light", "dark"] as const) {
      await page.setViewportSize({ width: 320, height: 760 });
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.goto(`/${locale}/favorites?view=wishes`);
      const nav = page.getByRole("navigation", {
        name: locale === "en" ? "Favorite categories" : "Suosikkien luokat",
      });
      await expect(nav.getByRole("link")).toHaveCount(3);
      for (const link of await nav.getByRole("link").all())
        await expect(link).toHaveText(/1$/);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: info.outputPath(`reserved-${locale}-${colorScheme}.png`),
        fullPage: true,
      });
    }
    await page.goto(`/${locale}/account/plan`);
    const topics = page.locator(
      'section[aria-labelledby="billing-help-heading"] details',
    );
    await expect(topics).toHaveCount(2);
    expect(
      await topics
        .nth(1)
        .evaluate((element) => getComputedStyle(element).borderTopWidth),
    ).toBe("0px");
  });
}
