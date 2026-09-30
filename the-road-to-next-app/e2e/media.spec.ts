import { expect, type Page, test } from "@playwright/test";
import sharp from "sharp";
import { accounts, resetFixtures, testPrisma } from "./seed";

const listUrl = "/lists/e2e-media-list";
const wishUrl = `${listUrl}/wishes/e2e-media-wish`;
const signIn = async (page: Page) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(accounts.owner.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(accounts.owner.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/lists$/);
};

const upload = async (page: Page, description: string, replacement = false) => {
  const buffer = await sharp({
    create: { width: 900, height: 600, channels: 3, background: "#467cb0" },
  })
    .png()
    .toBuffer();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer });
  await page.getByLabel("Image description", { exact: true }).fill(description);
  await page
    .getByRole("button", {
      name: replacement ? "Replace image" : "Upload image",
      exact: true,
    })
    .click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText(
    "Image saved.",
  );
  const image = page.getByRole("img", { name: description, exact: true });
  await expect(image).toBeVisible();
  await expect(image).toHaveJSProperty("naturalWidth", 900);
  return (await image.getAttribute("src"))!;
};

test.beforeEach(async () => {
  await resetFixtures();
  const prisma = testPrisma();
  try {
    await prisma.wishlist.create({
      data: {
        id: "e2e-media-list",
        title: "Image test list",
        publication: "PUBLISHED",
        ownerId: "e2e-owner",
        memberships: { create: { userId: "e2e-owner", role: "ADMIN" } },
        wishes: {
          create: {
            id: "e2e-media-wish",
            title: "A camera",
            authorId: "e2e-owner",
          },
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
});

test("list image upload, replacement, removal and revocation work through the UI", async ({
  page,
  request,
}, testInfo) => {
  await signIn(page);
  await page.goto(`${listUrl}/edit`);
  const first = await upload(page, "A blue landscape");
  expect((await request.get(first)).status()).toBe(200);
  const second = await upload(page, "A second blue landscape", true);
  expect(second).not.toBe(first);
  expect((await request.get(first)).status()).toBe(404);
  await page.screenshot({
    path: testInfo.outputPath("image-editor.png"),
    fullPage: true,
  });
  if (testInfo.project.name === "mobile-chromium") {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.emulateMedia({ colorScheme: "dark" });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("image-editor-narrow-dark.png"),
      fullPage: true,
    });
  }
  await page.goto(listUrl);
  await expect(
    page.getByRole("img", { name: "A second blue landscape" }),
  ).toHaveJSProperty("naturalWidth", 900);
  await page
    .getByRole("button", { name: "Move to drafts", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Publish list", exact: true }),
  ).toBeVisible();
  const revoked = await request.get(second, {
    headers: { "If-None-Match": '"old"' },
  });
  expect(revoked.status()).toBe(404);
  expect(revoked.headers()["cache-control"]).toContain("no-store");
  await page.goto(`${listUrl}/edit`);
  await page.getByRole("button", { name: "Remove image", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText(
    "Image removed.",
  );
  await expect(
    page.getByRole("button", { name: "Upload image", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(async (src) => (await fetch(src)).status, second),
  ).toBe(404);
});

test("wish images reject malformed files, survive errors and follow hidden access", async ({
  page,
  request,
}) => {
  await signIn(page);
  await page.goto(`${wishUrl}/edit`);
  await page.locator('input[type="file"]').setInputFiles({
    name: "fake.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await page
    .getByLabel("Image description", { exact: true })
    .fill("A fake image");
  await page.getByRole("button", { name: "Upload image", exact: true }).click();
  const error = page.getByRole("main").getByRole("alert");
  await expect(error).toContainText("valid, still JPEG");
  await expect(error).toBeFocused();
  const src = await upload(page, "A camera on a blue background");
  expect((await request.get(src)).status()).toBe(200);
  await page.goto(listUrl);
  await expect(
    page.getByRole("img", { name: "A camera on a blue background" }),
  ).toBeVisible();
  await page.goto(wishUrl);
  await page.getByRole("button", { name: "Hide wish", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Show wish", exact: true }),
  ).toBeVisible();
  expect((await request.get(src)).status()).toBe(404);
  expect(
    await page.evaluate(async (url) => (await fetch(url)).status, src),
  ).toBe(200);
  await page.goto(`${wishUrl}/edit`);
  await page.locator('input[type="file"]').setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(3 * 1024 * 1024 + 1),
  });
  await page
    .getByRole("button", { name: "Replace image", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("3 MB");
  await expect(
    page.getByRole("img", { name: "A camera on a blue background" }),
  ).toBeVisible();
});

test("avatar uploads are resized, private and removable", async ({
  page,
  request,
}) => {
  await signIn(page);
  await page.goto("/account/profile");
  const buffer = await sharp({
    create: { width: 900, height: 600, channels: 3, background: "#467cb0" },
  })
    .png()
    .toBuffer();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer });
  await page
    .getByLabel("Image description", { exact: true })
    .fill("My portrait");
  await page.getByRole("button", { name: "Upload image", exact: true }).click();
  const avatar = page.getByRole("img", { name: "My portrait" });
  await expect(avatar).toHaveJSProperty("naturalWidth", 512);
  const src = (await avatar.getAttribute("src"))!;
  expect((await request.get(src)).status()).toBe(404);
  await page.getByRole("button", { name: "Remove image", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Upload image", exact: true }),
  ).toBeVisible();
  await expect(avatar).toHaveCount(0);
});
