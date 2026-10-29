import { expect, type Page, test } from "@playwright/test";
import { accounts, resetFixtures, testPrisma } from "./seed";

test.beforeEach(resetFixtures);

for (const premium of [false, true]) {
  for (const locale of ["en", "fi"]) {
    test(`${locale}: hidden ${premium ? "Premium" : "free"} lists explain the correct sharing-card requirements`, async ({
      page,
    }) => {
      const db = testPrisma();
      try {
        if (premium)
          await db.premiumGrant.create({
            data: {
              userId: "e2e-owner",
              startsAt: new Date(),
              expiresAt: new Date(Date.now() + 86400000),
            },
          });
        await db.wishlist.create({
          data: {
            id: "e2e-card-access",
            title: "My hidden wishes",
            publication: "DRAFT",
            ownerId: "e2e-owner",
            memberships: { create: { userId: "e2e-owner", role: "ADMIN" } },
          },
        });
      } finally {
        await db.$disconnect();
      }
      await signIn(page);
      await page.goto(`/${locale}/lists/e2e-card-access`);
      await page
        .getByRole("button", {
          name: locale === "fi" ? "Jakokortti" : "Sharing card",
          exact: true,
        })
        .click();
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByText(
          locale === "fi"
            ? "Julkaise lista ennen jakokortin lataamista."
            : "Publish your list before downloading a sharing card.",
          { exact: true },
        ),
      ).toBeVisible();
      const upsell = dialog.getByRole("link", {
        name: locale === "fi" ? "Tutustu Premiumiin" : "Explore Premium",
        exact: true,
      });
      await expect(upsell).toHaveCount(premium ? 0 : 1);
      await expect(dialog.getByRole("radio")).toHaveCount(premium ? 0 : 3);
      await expect(
        dialog.getByRole("link", {
          name: locale === "fi" ? "Lataa jakokortti" : "Download sharing card",
          exact: true,
        }),
      ).toHaveCount(0);
      expect(
        (
          await page.request.get(
            "/api/lists/e2e-card-access/sharing-card?locale=en",
          )
        ).status(),
      ).toBe(404);
    });
  }
}

async function signIn(page: Page) {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(accounts.owner.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(accounts.owner.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/lists$/);
}
