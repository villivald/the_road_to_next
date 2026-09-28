import { expect, type Page, test } from "@playwright/test";
import { accounts, fixtureTicket, resetFixtures } from "./seed";

const signIn = async (page: Page, role: keyof typeof accounts) => {
  await page.goto("/sign-in");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill(accounts[role].email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(accounts[role].password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/tickets$/);
  await expect(
    page.getByRole("heading", { name: "My Tickets", exact: true }),
  ).toBeVisible();
};

test.beforeEach(async () => {
  await resetFixtures();
});

test("public feed and protected-page redirect", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "All Tickets", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByText(fixtureTicket.title, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign In", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("public-feed.png"),
    fullPage: true,
    animations: "disabled",
    scale: "css",
  });
  await page.goto("/tickets");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("invalid credentials leave the visitor signed out", async ({ page }) => {
  await page.goto("/sign-in");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill(accounts.owner.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("An-incorrect-password");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByText("Incorrect email or password", { exact: true }),
  ).toBeVisible();
  await page.goto("/tickets");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("owner can edit a ticket and add a persisted comment", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await signIn(page, "owner");
  await page.goto(`/tickets/${fixtureTicket.id}/edit`);
  await page
    .getByLabel("Title", { exact: true })
    .fill("Edited baseline ticket");
  await page.getByLabel("Bounty ($)", { exact: true }).fill("24.99");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/tickets/${fixtureTicket.id}$`));
  await expect(
    page
      .getByRole("main")
      .getByText("Edited baseline ticket", { exact: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByText("$24.99", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Write your comment here..." })
    .fill("A browser-tested comment");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(
    page
      .getByRole("main")
      .getByText("A browser-tested comment", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole("main")
      .getByText("A browser-tested comment", { exact: true }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("a member cannot open another user's ticket editor", async ({ page }) => {
  await signIn(page, "member");
  await page.goto(`/tickets/${fixtureTicket.id}/edit`);
  await expect(
    page.getByText("Ticket not found", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toHaveCount(0);
});
