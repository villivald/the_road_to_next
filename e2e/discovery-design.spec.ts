import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import sharp from "sharp";
import { testOrigin } from "./environment";
import { accounts, resetFixtures, testPrisma } from "./seed";

const listId = "e2e-design-discovery";
const title = "Small everyday joys";
const biography = `${"Books, gardens, and thoughtful little gifts. ".repeat(20)}\nBio end marker <script>alert(1)</script>`;
const signIn = async (page: Page) => {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(accounts.owner.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(accounts.owner.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/lists$/);
};
const upload = async (
  page: Page,
  query: string,
  alt: string,
  color: string,
) => {
  const buffer = await sharp({
    create: { width: 600, height: 450, channels: 3, background: color },
  })
    .png()
    .toBuffer();
  const target = new URLSearchParams(query);
  await page.goto(
    target.get("kind") === "avatar"
      ? "/en/account/profile"
      : `/en/lists/${target.get("listId")}/wishes/${target.get("wishId")}/edit`,
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "image.png", mimeType: "image/png", buffer });
  await page.getByLabel("Image description", { exact: true }).fill(alt);
  await page.getByRole("button", { name: "Upload image", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText(
    "Image saved.",
  );
};
const accessible = async (page: Page) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
};

test.beforeEach(async () => {
  await resetFixtures();
  const prisma = testPrisma();
  try {
    await prisma.user.update({
      where: { id: "e2e-owner" },
      data: { name: "Ada Müller", description: biography },
    });
    await prisma.wishlist.create({
      data: {
        id: listId,
        title,
        publication: "PUBLISHED",
        ownerId: "e2e-owner",
        memberships: { create: { userId: "e2e-owner", role: "ADMIN" } },
        wishes: {
          create: [
            {
              id: "e2e-design-cup",
              title: "Coffee cup",
              description: "Description stays on the wish detail page",
              priceMinor: 23400,
              currency: "EUR",
              priority: 3,
            },
            { id: "e2e-design-book", title: "Garden book" },
            { id: "e2e-design-trip", title: "Weekend trip" },
            { id: "e2e-design-secret", title: "Secret marker", hidden: true },
          ],
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
});

test("image previews, placeholders, ownership and card actions work", async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await signIn(page);
  await upload(
    page,
    `kind=wish&listId=${listId}&wishId=e2e-design-cup`,
    "A yellow cup",
    "#ffd803",
  );
  await upload(
    page,
    `kind=wish&listId=${listId}&wishId=e2e-design-book`,
    "A mint book",
    "#bae8e8",
  );
  await upload(
    page,
    `kind=wish&listId=${listId}&wishId=e2e-design-secret`,
    "Private image marker",
    "#ff0000",
  );
  let releaseImages!: () => void;
  const imagesReady = new Promise<void>((resolve) => {
    releaseImages = resolve;
  });
  await page.route("**/api/media/**", async (route) => {
    await imagesReady;
    await route.continue();
  });
  await page.goto("/en/lists", { waitUntil: "domcontentloaded" });
  const ownedCard = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: title }) });
  await expect(ownedCard.getByRole("img")).toHaveCount(2);
  const image = ownedCard.getByRole("img").first();
  await expect(image).toHaveJSProperty("naturalWidth", 0);
  const beforeImageLoad = await image.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
  }));
  releaseImages();
  await expect(image).toHaveJSProperty("naturalWidth", 600);
  const afterImageLoad = await image.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
  }));
  expect(afterImageLoad).toEqual(beforeImageLoad);
  await page.unroute("**/api/media/**");
  await expect(ownedCard.getByText("Anyone can view")).toBeVisible();
  await accessible(page);
  await page.screenshot({
    path: info.outputPath("my-list-previews.png"),
    fullPage: true,
  });
  const prisma = testPrisma();
  try {
    for (const state of [
      { publication: "DRAFT" as const, visibility: "PUBLIC" as const },
      { publication: "PUBLISHED" as const, visibility: "PRIVATE" as const },
    ]) {
      await prisma.wishlist.update({ where: { id: listId }, data: state });
      await page.reload();
      await expect(ownedCard.getByRole("img")).toHaveCount(2);
      await expect(
        ownedCard.getByText(
          state.publication === "DRAFT"
            ? "Hidden · Admins only"
            : "Restricted access",
        ),
      ).toBeVisible();
    }
    await prisma.wishlist.update({
      where: { id: listId },
      data: { publication: "PUBLISHED", visibility: "PUBLIC" },
    });
  } finally {
    await prisma.$disconnect();
  }
  await page.goto("/en/browse");
  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: title }) });
  await expect(card.getByText("Your list", { exact: true })).toBeVisible();
  expect(
    await card
      .getByText("Your list", { exact: true })
      .evaluate((badge) => getComputedStyle(badge).position),
  ).toBe("absolute");
  await expect(card.getByRole("img")).toHaveCount(2);
  await expect(
    card.getByRole("img", { name: "Private image marker" }),
  ).toHaveCount(0);
  await card.getByRole("button", { name: `Copy link to ${title}` }).click();
  await expect(card.getByRole("status")).toHaveText("Link copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${testOrigin}/en/lists/${listId}`,
  );
  await accessible(page);
  await page.screenshot({
    path: info.outputPath("list-previews.png"),
    fullPage: true,
  });
  await card
    .getByRole("link", { name: `Settings for ${title}`, exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/en/lists/${listId}/edit$`));
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/en/browse?view=wishes&q=Coffee");
    const wishCard = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: "Coffee cup" }) });
    await expect(
      wishCard.getByRole("link", { name: "View Coffee cup", exact: true }),
    ).toBeVisible();
    await expect(wishCard.getByRole("link", { name: title })).toBeVisible();
    await expect(
      wishCard.getByText("EUR 234.00", { exact: true }),
    ).toBeVisible();
    await expect(
      wishCard.getByRole("img", { name: "Priority: 3 out of 5 stars" }),
    ).toBeVisible();
    await expect(wishCard).not.toContainText(
      "Description stays on the wish detail page",
    );
    await accessible(page);
    await page.screenshot({
      path: info.outputPath(`compact-wishes-${theme}.png`),
      fullPage: true,
    });
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`/en/lists/${listId}`);
  await expect(
    page.getByText("A little wish", { exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("wish-placeholders.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Edit Weekend trip", exact: true })
    .click();
  await expect(page).toHaveURL(/e2e-design-trip\/edit$/);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/en/browse");
  await expect(page.getByText("Your list", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: `Settings for ${title}`, exact: true }),
  ).toHaveCount(0);
});

test("people search shows public names and avatars and filters their public lists", async ({
  page,
  request,
}, info) => {
  await signIn(page);
  await upload(page, "kind=avatar", "Ada’s avatar", "#bae8e8");
  const peoplePrisma = testPrisma();
  try {
    await peoplePrisma.wishlist.create({
      data: {
        id: "e2e-design-person-list",
        title: "Another public collection",
        publication: "PUBLISHED",
        ownerId: "e2e-member",
        memberships: { create: { userId: "e2e-member", role: "ADMIN" } },
      },
    });
  } finally {
    await peoplePrisma.$disconnect();
  }
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/en/browse?view=users");
    const ownCard = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: "Ada Müller" }) });
    await expect(ownCard.getByText("You", { exact: true })).toBeVisible();
    await expect(ownCard).not.toContainText("e2e-owner");
    await expect(ownCard).toContainText("Books, gardens");
    await expect(ownCard).not.toContainText("Bio end marker");
    const expand = ownCard.getByRole("button", {
      name: "Read more about Ada Müller",
    });
    await expect(expand).toHaveAttribute("aria-expanded", "false");
    await expand.click();
    await expect(ownCard).toContainText(
      "Bio end marker <script>alert(1)</script>",
    );
    await expect(ownCard.locator("script")).toHaveCount(0);
    await ownCard
      .getByRole("button", { name: "Show less about Ada Müller" })
      .click();
    await expect(ownCard).not.toContainText("Bio end marker");
    await expect(
      page.getByRole("heading", { name: "e2e-member", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText("@e2e-member");
    await accessible(page);
    await page.screenshot({
      path: info.outputPath(`people-cards-${theme}.png`),
      fullPage: true,
    });
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/en/browse?view=users");
  await page.getByLabel("Search people").fill("MÜLLER");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ada Müller" })).toBeVisible();
  const avatar = page.getByRole("img", { name: "Ada’s avatar" });
  await expect(avatar).toHaveJSProperty("naturalWidth", 512);
  const src = (await avatar.getAttribute("src"))!;
  await expect(page.getByRole("main")).not.toContainText(accounts.owner.email);
  await expect(page.getByRole("main")).toContainText("Books, gardens");
  await accessible(page);
  await page.screenshot({
    path: info.outputPath("people.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "View public lists", exact: true })
    .click();
  await expect(page).toHaveURL(/owner=e2e-owner/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Another person's private list" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Wishes", exact: true }).click();
  await expect(page).toHaveURL(/owner=e2e-owner/);
  await expect(
    page.getByRole("heading", { name: "Secret marker" }),
  ).toHaveCount(0);
  const prisma = testPrisma();
  try {
    await prisma.wishlist.update({
      where: { id: listId },
      data: { publication: "DRAFT" },
    });
  } finally {
    await prisma.$disconnect();
  }
  expect((await request.get(src)).status()).toBe(404);
  await page.goto("/en/browse?view=users&q=Müller");
  await expect(
    page.getByRole("heading", { name: "No results found" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText(
    "Try another name or username.",
  );
});

test("footer links and information pages are accessible in both themes", async ({
  page,
}, info) => {
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    for (const path of [
      "/",
      "/en/about",
      "/en/privacy",
      "/en/terms",
      "/en/accessibility",
      "/en/site-map",
      "/en/browse?view=users",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await accessible(page);
    }
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(
      footer.getByRole("link", { name: "Contact support" }),
    ).toHaveAttribute("href", "mailto:support@wishlist.fi");
    await expect(
      footer.getByRole("link", { name: "villivald", exact: true }),
    ).toHaveAttribute("href", "https://www.villivald.com/");
    await footer
      .getByRole("link", { name: "Accessibility", exact: true })
      .click();
    await expect(page).toHaveURL(/\/accessibility$/);
    await page.screenshot({
      path: info.outputPath(`footer-${theme}.png`),
      fullPage: true,
    });
    await page.setViewportSize({ width: 320, height: 800 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
