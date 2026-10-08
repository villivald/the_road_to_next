import { expect, type Page, test } from "@playwright/test";
import { generateRandomToken, hashToken } from "../src/utils/crypto";
import { accounts, resetFixtures, testPrisma } from "./seed";

const signIn = async (page: Page, account = accounts.owner) => {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/lists$/);
};

const createPromo = async (revokedAt: Date | null = null) => {
  const prisma = testPrisma();
  const code = `WL${generateRandomToken().toUpperCase()}`;
  try {
    const promo = await prisma.promoCode.create({
      data: {
        label: "e2e-browser",
        codeHash: hashToken(`promo:${code}`),
        durationDays: 30,
        maxRedemptions: 10,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt,
      },
    });
    return { ...promo, code };
  } finally {
    await prisma.$disconnect();
  }
};

const redeem = async (page: Page, code: string) => {
  await page.getByLabel("Promo code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Redeem code", exact: true }).click();
};

test.beforeEach(resetFixtures);

test("account navigation, invalid input, redemption, replay and extension", async ({
  page,
}, info) => {
  const first = await createPromo();
  const second = await createPromo();
  await signIn(page);
  await page.getByRole("link", { name: "Account", exact: true }).click();
  await page.getByRole("link", { name: "Your plan and promo codes" }).click();
  await expect(
    page.getByRole("heading", { name: "Free", exact: true }),
  ).toBeVisible();
  await redeem(page, "invalid");
  await expect(page.getByRole("main").getByRole("alert")).toBeFocused();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "unavailable",
  );
  await expect(page.getByLabel("Promo code", { exact: true })).toHaveValue("");
  await redeem(page, ` ${first.code.toLowerCase()} `);
  await expect(
    page.getByRole("heading", { name: "Premium", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Promo code redeemed");
  const expiry = await page.locator("time").getAttribute("datetime");
  await redeem(page, first.code);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "already redeemed",
  );
  expect(await page.locator("time").getAttribute("datetime")).toBe(expiry);
  await redeem(page, second.code);
  await expect(page.getByRole("status")).toContainText("Promo code redeemed");
  expect(
    new Date((await page.locator("time").getAttribute("datetime"))!).getTime() -
      new Date(expiry!).getTime(),
  ).toBe(30 * 86400000);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Premium", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("premium-desktop.png"),
    fullPage: true,
    scale: "css",
  });
});

test("submitted identity and duration cannot change the recipient or the grant", async ({
  page,
}) => {
  const promo = await createPromo();
  await signIn(page);
  await page.goto("/en/account/plan");
  await page.getByLabel("Promo code", { exact: true }).evaluate((input) => {
    for (const [name, value] of Object.entries({
      userId: "e2e-member",
      durationDays: "365",
      plan: "PREMIUM",
    })) {
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = name;
      hidden.value = value;
      (input as HTMLInputElement).form!.appendChild(hidden);
    }
  });
  await redeem(page, promo.code);
  await expect(page.getByRole("status")).toContainText("Promo code redeemed");
  const prisma = testPrisma();
  try {
    expect(
      await prisma.premiumGrant.count({ where: { userId: "e2e-member" } }),
    ).toBe(0);
    const granted = await prisma.premiumGrant.findFirstOrThrow({
      where: { userId: "e2e-owner" },
    });
    expect(granted.expiresAt.getTime() - granted.startsAt.getTime()).toBe(
      30 * 86400000,
    );
  } finally {
    await prisma.$disconnect();
  }
});

test("scheduled access starts and expires while the plan page remains open", async ({
  page,
}) => {
  await signIn(page);
  const prisma = testPrisma();
  try {
    await prisma.premiumGrant.create({
      data: {
        userId: "e2e-owner",
        startsAt: new Date(Date.now() + 4000),
        expiresAt: new Date(Date.now() + 8000),
      },
    });
    await page.goto("/en/account/plan");
    await expect(
      page.getByRole("heading", { name: "Free", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Your next Premium period starts"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Premium", exact: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: "Free", exact: true }),
    ).toBeVisible({ timeout: 10000 });
    expect(
      await prisma.premiumGrant.count({ where: { userId: "e2e-owner" } }),
    ).toBe(1);
  } finally {
    await prisma.$disconnect();
  }
});

test("revoked codes and expired sessions cannot consume a grant", async ({
  page,
}) => {
  const revoked = await createPromo(new Date());
  const valid = await createPromo();
  await signIn(page);
  await page.goto("/en/account/plan");
  await redeem(page, revoked.code);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "unavailable",
  );
  const prisma = testPrisma();
  try {
    await prisma.session.deleteMany({ where: { userId: "e2e-owner" } });
    await redeem(page, valid.code);
    await expect(page).toHaveURL(/\/sign-in$/);
    expect(
      await prisma.premiumGrant.count({ where: { userId: "e2e-owner" } }),
    ).toBe(0);
    expect(
      await prisma.promoCode.findUnique({ where: { id: valid.id } }),
    ).toMatchObject({ redemptionCount: 0 });
  } finally {
    await prisma.$disconnect();
  }
});

test("plan and redemption work with a keyboard at 320px in dark mode", async ({
  page,
}, info) => {
  const promo = await createPromo();
  await signIn(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/en/account/plan");
  await page.getByLabel("Promo code", { exact: true }).fill(promo.code);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Redeem code", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Premium", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("premium-narrow-dark.png"),
    fullPage: true,
    scale: "css",
  });
});
