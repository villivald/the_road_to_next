import { expect, type Page, test } from "@playwright/test";
import { testOrigin } from "./environment";
import { accounts, resetFixtures, testPrisma } from "./seed";

const signIn = async (page: Page, account = accounts.owner) => {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/lists$/);
};

const createPublishedList = async (page: Page) => {
  await signIn(page);
  await page.getByRole("link", { name: "Create a list", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Birthday list");
  await page.getByRole("button", { name: "Create list", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Birthday list", exact: true }),
  ).toBeVisible();
  const listUrl = new URL(page.url()).pathname;
  await page.getByRole("link", { name: "List settings", exact: true }).click();
  await page.getByRole("button", { name: "Show list", exact: true }).click();
  await expect(page.getByRole("button", { name: "Hide list" })).toBeVisible();

  await page.getByRole("link", { name: "Back to list", exact: true }).click();
  await expect(page).toHaveURL(listUrl);
  await expect(
    page.getByRole("link", { name: "Add a wish", exact: true }),
  ).toBeVisible();
  return listUrl;
};

const addWish = async (page: Page, title: string) => {
  await page.getByRole("link", { name: "Add a wish", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByRole("button", { name: "Add wish", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();

  return new URL(page.url()).pathname;
};

test.beforeEach(resetFixtures);

test("title-only wishes can be hidden, fulfilled, reopened, and deleted", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const listUrl = await createPublishedList(page);
  const wishUrl = await addWish(page, "A beautiful notebook");
  await expect(page.getByRole("main")).toContainText("No price added");
  const visitor = await browser.newPage({ baseURL: testOrigin });

  try {
    await visitor.goto(wishUrl);
    await expect(
      visitor.getByRole("heading", {
        name: "A beautiful notebook",
        exact: true,
      }),
    ).toBeVisible();
    await expect(visitor.getByRole("link", { name: "Edit wish" })).toHaveCount(
      0,
    );

    await page.getByRole("button", { name: "Hide wish", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Show wish", exact: true }),
    ).toBeVisible();
    await visitor.reload();
    await expect(
      visitor.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
    await visitor.goto(listUrl);
    await expect(
      visitor.getByRole("heading", { name: "No wishes available" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Show wish", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Hide wish", exact: true }),
    ).toBeVisible();
    await visitor.goto(wishUrl);
    await expect(
      visitor.getByRole("heading", {
        name: "A beautiful notebook",
        exact: true,
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Mark as fulfilled" }).click();
    await expect(
      page.getByRole("button", { name: "Reopen wish" }),
    ).toBeVisible();
    await visitor.reload();
    await expect(
      visitor.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Back to Birthday list", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "No wishes yet" }),
    ).toBeVisible();
    await page.getByLabel("Show", { exact: true }).selectOption("fulfilled");
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Fulfilled wishes" }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "A beautiful notebook", exact: true })
      .click();
    await page.getByRole("button", { name: "Reopen wish" }).click();
    await expect(
      page.getByRole("button", { name: "Mark as fulfilled" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Delete wish", exact: true }).click();
    await page.getByRole("link", { name: "Cancel and keep wish" }).click();
    await expect(
      page.getByRole("heading", { name: "A beautiful notebook", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Delete wish", exact: true }).click();
    await page.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page.getByRole("checkbox")).toBeFocused();
    await page.getByLabel("I understand this cannot be undone").check();
    await page.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page.getByRole("status")).toContainText("Wish deleted");
    await visitor.goto(wishUrl);
    await expect(
      visitor.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await visitor.close();
  }
});

test("validates optional fields, preserves input, and displays all supported currencies", async ({
  page,
}, info) => {
  await createPublishedList(page);
  await page.getByRole("link", { name: "Add a wish", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("A fountain pen");
  await page
    .getByLabel("Description (optional)")
    .fill("Fine nib, deep blue.\nA small everyday favorite.");
  await page
    .getByLabel("Product link (optional)")
    .fill("ftp://example.com/pen");
  await page.getByLabel("Price (optional)").fill("1.005");
  await page.getByLabel("Currency", { exact: true }).selectOption("EUR");
  await page.getByLabel("Priority (optional)").selectOption("5");
  await page.getByLabel("Hide this wish").check();
  await page.getByRole("button", { name: "Add wish", exact: true }).click();

  await expect(page.getByRole("main").getByRole("alert")).toBeFocused();
  await expect(
    page.getByText(
      "Use a non-negative price with at most two decimal places.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Enter a full HTTP or HTTPS link without login details", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "A fountain pen",
  );
  await expect(page.getByLabel("Description (optional)")).toHaveValue(
    /Fine nib/,
  );
  await expect(page.getByLabel("Priority (optional)")).toHaveValue("5");
  await expect(page.getByLabel("Hide this wish")).toBeChecked();

  await page
    .getByLabel("Product link (optional)")
    .fill("https://example.com/pen");
  await page.getByLabel("Price (optional)").fill("19,99");
  await page.getByLabel("Hide this wish").uncheck();
  await page.getByRole("button", { name: "Add wish", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A fountain pen", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText(/EUR\s*19\.99/);
  await expect(
    page.getByRole("img", { name: "Priority: 5 out of 5 stars" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View product (opens in a new tab)" }),
  ).toHaveAttribute("href", "https://example.com/pen");
  await page.screenshot({
    path: info.outputPath("wish-details.png"),
    fullPage: true,
    animations: "disabled",
    scale: "css",
  });

  for (const [currency, amount] of [
    ["USD", "0"],
    ["GBP", "12.50"],
  ]) {
    await page.getByRole("link", { name: "Edit wish" }).click();
    await page.getByLabel("Price (optional)").fill(amount);
    await page.getByLabel("Currency", { exact: true }).selectOption(currency);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByRole("heading", { name: "A fountain pen", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toContainText(
      new RegExp(
        `${currency}\\s*${Number(amount).toFixed(2).replace(".", "\\.")}`,
      ),
    );
  }

  await page.getByRole("link", { name: "Edit wish" }).click();
  await page.getByLabel("Price (optional)").fill("");
  await page.getByLabel("Description (optional)").fill("");
  await page.getByLabel("Product link (optional)").fill("");
  await page.getByLabel("Priority (optional)").selectOption("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("main")).toContainText("No price added");
  await expect(
    page.getByRole("link", { name: "View product (opens in a new tab)" }),
  ).toHaveCount(0);
});

test("ordering is stable and private wish data never appears in viewer responses", async ({
  page,
  browser,
}) => {
  const listUrl = await createPublishedList(page);
  const listId = listUrl.split("/").at(-1)!;
  const prisma = testPrisma();
  const visitor = await browser.newPage({ baseURL: testOrigin });

  try {
    await prisma.wish.createMany({
      data: [
        {
          id: "e2e-alpha",
          title: "Alpha book",
          wishlistId: listId,
          priority: 1,
        },
        {
          id: "e2e-zebra",
          title: "Zebra notebook",
          wishlistId: listId,
          priority: 5,
        },
        {
          id: "e2e-secret",
          title: "Hidden secret title",
          wishlistId: listId,
          hidden: true,
        },
        {
          id: "e2e-fulfilled",
          title: "Fulfilled secret title",
          wishlistId: listId,
          fulfilledAt: new Date(),
        },
        {
          id: "e2e-reserved",
          title: "Reserved secret title",
          wishlistId: listId,
        },
      ],
    });
    await prisma.reservation.create({
      data: { wishId: "e2e-reserved", userId: "e2e-owner" },
    });

    await visitor.goto(listUrl);
    await visitor.getByLabel("Sort wishes").selectOption("priority");
    await visitor.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(visitor.getByRole("heading", { level: 3 }).first()).toHaveText(
      "Zebra notebook",
    );
    await visitor.getByLabel("Sort wishes").selectOption("title");
    await visitor.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(visitor.getByRole("heading", { level: 3 }).first()).toHaveText(
      "Alpha book",
    );

    for (const suffix of [
      "",
      "/wishes/e2e-secret",
      "/wishes/e2e-fulfilled",
      "/wishes/e2e-reserved",
    ]) {
      const response = await visitor.request.get(`${listUrl}${suffix}`);
      const html = await response.text();
      expect(html).not.toContain("Hidden secret title");
      expect(html).not.toContain("Fulfilled secret title");
      expect(html).not.toContain("Reserved secret title");
      expect(html).not.toContain(accounts.owner.email);
    }

    await signIn(visitor, accounts.member);
    await visitor.goto(`${listUrl}/wishes/e2e-alpha/edit`);
    await expect(
      visitor.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
    await visitor.goto(`${listUrl}/wishes/new`);
    await expect(
      visitor.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
  } finally {
    await visitor.close();
    await prisma.$disconnect();
  }
});

test("a removed admin cannot submit an already open wish editor", async ({
  page,
}) => {
  const prisma = testPrisma();

  try {
    await prisma.membership.create({
      data: {
        wishlistId: "e2e-private-list",
        userId: "e2e-owner",
        role: "ADMIN",
      },
    });
    await signIn(page);
    await page.goto("/en/lists/e2e-private-list/wishes/e2e-wish/edit");
    await page.getByLabel("Title", { exact: true }).fill("Unauthorized change");
    await prisma.membership.delete({
      where: {
        wishlistId_userId: {
          wishlistId: "e2e-private-list",
          userId: "e2e-owner",
        },
      },
    });
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "do not have permission",
    );
    await expect(page.getByRole("main").getByRole("alert")).toBeFocused();
    expect(
      (await prisma.wish.findUniqueOrThrow({ where: { id: "e2e-wish" } }))
        .title,
    ).toBe("Private wish");
  } finally {
    await prisma.$disconnect();
  }
});

test("wish forms fit 320px dark layouts and work with the keyboard", async ({
  page,
}, info) => {
  await createPublishedList(page);
  await page.setViewportSize({ width: 320, height: 727 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.reload();
  await page.getByRole("link", { name: "Add a wish", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("A notebook with room for every little idea");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Description (optional)")).toBeFocused();
  await page.getByLabel("Price (optional)").fill("12,50");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Currency", { exact: true })).toBeFocused();
  await page.getByLabel("Currency", { exact: true }).selectOption("EUR");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("narrow-dark-wish-form.png"),
    fullPage: true,
    animations: "disabled",
    scale: "css",
  });
  await page.getByRole("button", { name: "Add wish", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "A notebook with room for every little idea",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
