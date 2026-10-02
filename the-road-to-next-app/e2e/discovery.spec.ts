import { expect, type Page, test } from "@playwright/test";
import { testEnvironment } from "./environment";
import { accounts, newAccount, resetFixtures, testPrisma } from "./seed";

const listId = "e2e-discovery-list";
const wishId = "e2e-discovery-wish";
const wishUrl = `/lists/${listId}/wishes/${wishId}`;

const submitSignIn = async (page: Page, account = accounts.member) => {
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
};

test.beforeEach(async () => {
  await resetFixtures();
  const prisma = testPrisma();
  try {
    await prisma.wishlist.create({
      data: {
        id: listId,
        title: "Birthday reading list",
        publication: "PUBLISHED",
        reservationsEnabled: true,
        ownerId: "e2e-owner",
        memberships: { create: { userId: "e2e-owner", role: "ADMIN" } },
        wishes: {
          create: [
            {
              id: wishId,
              title: "A garden book",
              authorId: "e2e-owner",
              priceMinor: 1999,
              currency: "EUR",
              priority: 4,
            },
            {
              id: "e2e-hidden-discovery",
              title: "Hidden discovery secret",
              authorId: "e2e-owner",
              hidden: true,
            },
            {
              id: "e2e-fulfilled-discovery",
              title: "Fulfilled discovery secret",
              authorId: "e2e-owner",
              fulfilledAt: new Date(),
            },
          ],
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
});

test("browse another user's list, sign in, reserve and remove it from discovery", async ({
  page,
  request,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("link", { name: "Browse public wishlists" }).click();
  await expect(page.getByRole("main")).toContainText("1 available wish");
  await page.screenshot({
    path: info.outputPath("browse-lists.png"),
    fullPage: true,
    scale: "css",
  });
  await page
    .getByRole("link", { name: "Birthday reading list", exact: true })
    .click();
  await page.getByRole("link", { name: "A garden book", exact: true }).click();
  await page.getByRole("link", { name: "Sign in to reserve" }).click();
  await submitSignIn(page);
  await expect(page).toHaveURL(wishUrl);
  await page.getByRole("button", { name: "Reserve wish", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cancel reservation", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Browse", exact: true }).click();
  await expect(page.getByRole("main")).toContainText("0 available wishes");
  await page.getByRole("link", { name: "Wishes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No results found" }),
  ).toBeVisible();
  const response = await request.get("/browse?view=wishes");
  expect(await response.text()).not.toContain("A garden book");
  expect(response.headers()["cache-control"]).toContain("no-store");
  await page
    .getByRole("link", { name: "My reservations", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "A garden book", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel reservation", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText(
    "Reservation canceled.",
  );
  await page.goto("/browse?view=wishes");
  await expect(
    page.getByRole("link", { name: "A garden book", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("discovery uses public permissions even for an owner and unavailable links stay private", async ({
  page,
  request,
}) => {
  await page.goto("/sign-in");
  await submitSignIn(page, accounts.owner);
  await expect(page).toHaveURL(/\/lists$/);
  for (const view of ["lists", "wishes"]) {
    const response = await page.goto(`/browse?view=${view}`);
    const body = await response!.text();
    for (const secret of [
      "Hidden discovery secret",
      "Fulfilled discovery secret",
      "Another person's private list",
      "Archived list",
      accounts.owner.email,
      accounts.member.email,
    ]) {
      expect(body).not.toContain(secret);
    }
  }
  for (const id of ["e2e-hidden-discovery", "e2e-fulfilled-discovery"]) {
    const response = await request.get(`/lists/${listId}/wishes/${id}`);
    expect(await response.text()).toContain("Page not found");
    expect(await response.text()).not.toContain("discovery secret");
  }
  const prisma = testPrisma();
  try {
    await prisma.wishlist.update({
      where: { id: listId },
      data: { publication: "DRAFT" },
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "No results found" }),
    ).toBeVisible();
    const response = await request.get(wishUrl);
    expect(await response.text()).not.toContain("A garden book");
  } finally {
    await prisma.$disconnect();
  }
});

test("currency filters, pagination and keyboard search work in a narrow dark layout", async ({
  page,
}, info) => {
  const prisma = testPrisma();
  try {
    await prisma.wish.createMany({
      data: Array.from({ length: 22 }, (_, index) => ({
        id: `e2e-discovery-price-${index}`,
        title: `Reading pick ${String(index).padStart(2, "0")}`,
        wishlistId: listId,
        authorId: "e2e-owner",
        priceMinor: index * 100,
        currency: "EUR" as const,
        priority: 5,
      })),
    });
  } finally {
    await prisma.$disconnect();
  }
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/browse?view=wishes");
  await page.getByLabel("Search wishes").fill("Reading pick");
  await page.getByLabel("Sort by").selectOption("price-low");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Choose a currency",
  );
  await page.getByLabel("Currency", { exact: true }).selectOption("EUR");
  await page.getByLabel("Minimum price").fill("0");
  await page.getByLabel("Maximum price").fill("21");
  await page.getByLabel("Minimum priority").selectOption("5");
  await page.getByLabel("Reservations enabled").check();
  await page.getByRole("button", { name: "Search", exact: true }).focus();
  await page.keyboard.press("Enter");
  const results = page.getByRole("list", { name: "Public wishes" });
  await expect(results.getByRole("listitem")).toHaveCount(20);
  await expect(results.getByRole("heading").first()).toHaveText(
    "Reading pick 00",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Next page" }).click();
  await expect(results.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByLabel("Minimum price")).toHaveValue("0");
  await expect(page.getByLabel("Currency", { exact: true })).toHaveValue("EUR");
  await expect(page.getByLabel("Reservations enabled")).toBeChecked();
  await page.screenshot({
    path: info.outputPath("browse-narrow-dark.png"),
    fullPage: true,
    scale: "css",
  });
  await page.getByRole("link", { name: "Previous page" }).click();
  await expect(results.getByRole("heading").first()).toHaveText(
    "Reading pick 00",
  );
  await page.getByLabel("Currency", { exact: true }).selectOption("USD");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No results found" }),
  ).toBeVisible();
});

test("registration and email verification return to the wish without reserving automatically", async ({
  page,
}) => {
  await fetch(`${testEnvironment.MAILPIT_URL}/api/v1/messages`, {
    method: "DELETE",
  });
  await page.goto(wishUrl);
  await page.getByRole("link", { name: "Sign in to reserve" }).click();
  await page.getByRole("link", { name: "Create an account" }).click();
  await page.getByLabel("Username", { exact: true }).fill(newAccount.username);
  await page.getByLabel("Email", { exact: true }).fill(newAccount.email);
  await page.getByLabel("Password", { exact: true }).fill(newAccount.password);
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill(newAccount.password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/email-verification\?returnTo=/);
  const response = await fetch(
    `${testEnvironment.MAILPIT_URL}/api/v1/message/latest`,
  );
  const message = (await response.json()) as { Text: string };
  const code = message.Text.match(/\b[A-Z]{8}\b/)?.[0];
  expect(code).toBeTruthy();
  await page.getByLabel("Verification code", { exact: true }).fill(code!);
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page).toHaveURL(wishUrl);
  await expect(
    page.getByRole("button", { name: "Reserve wish", exact: true }),
  ).toBeVisible();
});

test("tampered return destinations are rejected and revoked content is checked after sign-in", async ({
  page,
}) => {
  await page.goto(wishUrl);
  await page.getByRole("link", { name: "Sign in to reserve" }).click();
  await page.locator('input[name="returnTo"]').evaluate((input) => {
    (input as HTMLInputElement).value = "https://example.com/";
  });
  await submitSignIn(page);
  await expect(page).toHaveURL(/\/lists$/);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto(wishUrl);
  await page.getByRole("link", { name: "Sign in to reserve" }).click();
  const prisma = testPrisma();
  try {
    await prisma.wishlist.update({
      where: { id: listId },
      data: { publication: "DRAFT" },
    });
  } finally {
    await prisma.$disconnect();
  }
  await submitSignIn(page);
  await expect(page).toHaveURL(wishUrl);
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).not.toContainText("A garden book");
});
