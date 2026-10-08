import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { testOrigin } from "./environment";
import { accounts, resetFixtures, testPrisma } from "./seed";

const listUrl = "/en/lists/e2e-design";
const wishUrl = `${listUrl}/wishes/e2e-design-wish`;

const signIn = async (page: Page) => {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(accounts.owner.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(accounts.owner.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/lists$/);
};

const checkPage = async (page: Page) => {
  await expect(page.locator("[data-loading-preview]")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
};

test.beforeEach(async () => {
  await resetFixtures();
  const prisma = testPrisma();
  try {
    await prisma.premiumGrant.create({
      data: {
        userId: "e2e-owner",
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    await prisma.wishlist.create({
      data: {
        id: "e2e-design",
        title: "Little joys for everyday life",
        description:
          "A few thoughtful things for slow mornings and new adventures.",
        ownerId: "e2e-owner",
        publication: "PUBLISHED",
        reservationsEnabled: true,
        memberships: {
          create: [
            { userId: "e2e-owner", role: "ADMIN" },
            { userId: "e2e-member", role: "ADMIN" },
          ],
        },
        wishes: {
          create: [
            {
              id: "e2e-design-wish",
              title: "A handmade coffee cup",
              description:
                "Something to make the first coffee of the day feel special.",
              priceMinor: 2400,
              currency: "EUR",
              priority: 4,
              authorId: "e2e-owner",
            },
            {
              title: "A book for a rainy afternoon",
              priceMinor: 1800,
              currency: "EUR",
              priority: 3,
              authorId: "e2e-owner",
            },
            {
              title: "A weekend adventure",
              description: "A little time outdoors.",
              authorId: "e2e-owner",
            },
          ],
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
});

for (const theme of ["light", "dark"] as const) {
  test(`public screens are accessible in ${theme} mode`, async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    for (const path of [
      "/",
      "/en/sign-in",
      "/en/sign-up",
      "/en/browse?view=wishes",
      listUrl,
      wishUrl,
    ]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveClass(new RegExp(theme));
      await checkPage(page);
      expect(errors).toEqual([]);
      if (path === "/" || path.startsWith("/en/browse")) {
        await page.screenshot({
          path: info.outputPath(path === "/" ? "home.png" : "browse.png"),
          fullPage: true,
        });
      }
    }
  });

  test(`account, editors, and sharing are accessible in ${theme} mode`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await signIn(page);
    for (const path of [
      "/en/lists",
      "/en/lists/new",
      listUrl,
      `${listUrl}/edit`,
      `${wishUrl}/edit`,
      `${listUrl}/wishes/new`,
      `${listUrl}/sharing`,
      `${listUrl}/guest-links`,
      "/en/reservations",
      "/en/account/profile",
      "/en/account/plan",
      "/en/account/delete",
    ]) {
      await page.goto(path);
      await checkPage(page);
      if (
        path === listUrl ||
        path === "/en/lists/new" ||
        path === "/en/account/profile" ||
        path === `${listUrl}/wishes/new` ||
        path.endsWith("/edit") ||
        path.endsWith("/sharing") ||
        path.endsWith("/guest-links")
      ) {
        await page.screenshot({
          path: info.outputPath(
            path === listUrl
              ? "list.png"
              : path === "/en/lists/new"
                ? "new-list.png"
                : path === "/en/account/profile"
                  ? "profile.png"
                  : path === `${listUrl}/wishes/new`
                    ? "new-wish.png"
                    : path === `${listUrl}/edit`
                      ? "list-settings.png"
                      : path.endsWith("/edit")
                        ? "editor.png"
                        : path.endsWith("/sharing")
                          ? "sharing.png"
                          : "guest-links.png",
          ),
          fullPage: true,
        });
      }
    }
    const tree = await page.getByRole("main").ariaSnapshot();
    expect(tree).toContain('heading "Delete your account"');
    expect(tree).toContain('textbox "Current password"');
  });
}

test("narrow navigation, expanded filters, text resizing and reduced motion", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await signIn(page);
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(
    navigation.getByRole("link", { name: "My lists", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await navigation.getByRole("link", { name: "Browse", exact: true }).click();
  await expect(
    navigation.getByRole("link", { name: "Browse", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Wishes", exact: true }).click();
  await expect(page.getByLabel("Minimum price")).toBeHidden();
  const summary = page.getByText("Price and priority filters", { exact: true });
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Minimum price")).toBeVisible();
  await page.getByLabel("Currency", { exact: true }).selectOption("EUR");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/currency=EUR/);
  await expect(page.getByLabel("Minimum price")).toBeVisible();
  await checkPage(page);
  await page.screenshot({
    path: info.outputPath("narrow-filters.png"),
    fullPage: true,
  });
  // 320 CSS px covers reflow at 400% on a 1280px viewport; additionally check 200% text.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("large-text.png"),
    fullPage: true,
  });
  const motion = await page
    .getByRole("main")
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(motion).toBe("0s");
  for (const path of [
    "/en/lists",
    "/en/lists/new",
    `${listUrl}/edit`,
    `${wishUrl}/edit`,
    `${listUrl}/wishes/new`,
    `${listUrl}/sharing`,
    `${listUrl}/guest-links`,
    "/en/account/profile",
  ]) {
    await page.goto(path);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      path,
    ).toBe(true);
  }
});

test("dates use the viewer's timezone and theme selection persists", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: testOrigin,
    locale: "fi-FI",
    timezoneId: "Europe/Helsinki",
    colorScheme: "light",
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await signIn(page);
    await page.goto("/en/account/plan");
    const time = page.locator("main time").first();
    const expected = await time.evaluate((element) =>
      new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(element.getAttribute("datetime")!)),
    );
    await expect(time).toHaveText(expected);
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(
      page.getByRole("button", { name: "Toggle theme" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
