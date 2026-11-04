import { expect, test } from "@playwright/test";
import { resetFixtures, testPrisma } from "./seed";

test.beforeEach(async () => {
  await resetFixtures();
  const db = testPrisma();
  try {
    await db.wishlist.create({
      data: {
        id: "e2e-filter-list",
        title: "Filter books",
        ownerId: "e2e-owner",
        memberships: { create: { userId: "e2e-owner", role: "ADMIN" } },
        wishes: {
          create: [
            {
              title: "Alpha book",
              priceMinor: 1000,
              currency: "EUR",
              priority: 2,
            },
            {
              title: "Beta book",
              priceMinor: 2000,
              currency: "EUR",
              priority: 5,
            },
          ],
        },
      },
    });
  } finally {
    await db.$disconnect();
  }
});

for (const locale of ["en", "fi"] as const) {
  test(`${locale}: browse filters update automatically and restore controls after clear and Back`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/browse?view=wishes&page=2`);
    await expect(page.locator("[data-loading-preview]")).not.toBeVisible();
    const search = page.locator("#browse-search");
    const sort = page.locator("#browse-sort");
    await search.fill("book");
    await expect(page).toHaveURL(
      (url) =>
        url.searchParams.get("q") === "book" && !url.searchParams.has("page"),
    );
    await expect(search).toBeFocused();
    await sort.focus();
    await sort.selectOption("title");
    await expect(page).toHaveURL(/sort=title/);
    await expect(sort).toBeFocused();
    await expect(
      page.getByRole("heading", { name: "Alpha book", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Beta book", exact: true }),
    ).toBeVisible();
    await page
      .getByText(
        locale === "fi"
          ? "Rajaa hinnan ja tärkeyden mukaan"
          : "Price and priority filters",
        { exact: true },
      )
      .click();
    await page.locator("#browse-currency").selectOption("EUR");
    await page.locator("#browse-min").fill("15");
    await page.locator("#browse-priority").selectOption("4");
    await expect(page).toHaveURL(
      (url) =>
        url.searchParams.get("min") === "15" &&
        url.searchParams.get("priority") === "4" &&
        url.searchParams.get("currency") === "EUR",
    );
    await expect(
      page.getByRole("heading", { name: "Alpha book", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Beta book", exact: true }),
    ).toBeVisible();
    const clear = page.getByRole("link", {
      name: locale === "fi" ? "Tyhjennä suodattimet" : "Clear filters",
      exact: true,
    });
    await clear.click();
    await expect(search).toHaveValue("");
    await expect(sort).toHaveValue("newest");
    await expect(page.locator("#browse-currency")).toHaveValue("");
    await page.goBack();
    await expect(search).toHaveValue("book");
    await expect(sort).toHaveValue("title");
    await expect(page.locator("#browse-min")).toHaveValue("15");
    await expect(page.locator("#browse-priority")).toHaveValue("4");
    await clear.click();
    await expect(search).toHaveValue("");
    await page.clock.install();
    await search.fill("discard this draft");
    await clear.click();
    await page.clock.fastForward(500);
    await expect(search).toHaveValue("");
    await expect(page).toHaveURL((url) => !url.searchParams.has("q"));
  });
}

test("typing through pending responses and composition preserves the latest search and focus", async ({
  page,
}) => {
  await page.goto("/en/browse?view=wishes");
  await expect(page.locator("[data-loading-preview]")).not.toBeVisible();
  const search = page.getByLabel("Search wishes");
  await page.route("**/browse?**", async (route) => {
    if (route.request().headers().rsc === "1") {
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ response });
    } else await route.continue();
  });
  const firstRequest = page.waitForRequest(
    (request) => new URL(request.url()).searchParams.get("q") === "Al",
  );
  await search.fill("Al");
  await firstRequest;
  await search.fill("Alpha book");
  await expect(page).toHaveURL(
    (url) => url.searchParams.get("q") === "Alpha book",
  );
  await expect(search).toHaveValue("Alpha book");
  await expect(search).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Alpha book", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Beta book", exact: true }),
  ).toHaveCount(0);
  await page.unrouteAll({ behavior: "wait" });
  await page.clock.install();
  await search.dispatchEvent("compositionstart");
  await search.fill("Beta");
  await page.clock.fastForward(1000);
  await expect(page).toHaveURL(
    (url) => url.searchParams.get("q") === "Alpha book",
  );
  await search.dispatchEvent("compositionend");
  await page.clock.fastForward(400);
  await expect(page).toHaveURL((url) => url.searchParams.get("q") === "Beta");
  await expect(search).toBeFocused();
  await search.fill("Alpha");
  await search.press("Enter");
  await expect(page).toHaveURL((url) => url.searchParams.get("q") === "Alpha");
});
