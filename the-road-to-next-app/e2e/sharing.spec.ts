import { expect, type Locator, type Page, test } from "@playwright/test";
import { testEnvironment, testOrigin } from "./environment";
import { accounts, newAccount, resetFixtures, testPrisma } from "./seed";

const listUrl = "/lists/e2e-collaboration";
const sharingUrl = `${listUrl}/sharing`;
const title = "Private family wishlist";

const signIn = async (
  page: Page,
  account = accounts.owner,
  destination?: string,
) => {
  await page.goto(destination ?? "/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(destination ?? /\/lists$/);
};

const latestMail = async () =>
  (await (
    await fetch(`${testEnvironment.MAILPIT_URL}/api/v1/message/latest`)
  ).json()) as { Text: string; HTML: string };

const invite = async (
  page: Page,
  email = accounts.member.email,
  role = "MEMBER",
) => {
  await page.goto(sharingUrl);
  await page.getByLabel("Invitation email").fill(email);
  await page.getByLabel("Invitation role").selectOption(role);
  await page
    .getByRole("button", { name: "Send invitation", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Invitation created");
  await expect(page.getByText("Email sent", { exact: false })).toBeVisible();
  const message = await latestMail();
  expect(message.Text).not.toContain(title);
  expect(message.Text).not.toContain("Secret gift");
  return message.Text.match(
    /https?:\/\/[^\s]+\/invitations\/[a-zA-Z0-9_-]+/,
  )![0];
};

const join = async (page: Page) => {
  await page.getByRole("checkbox", { name: /I want to join/ }).check();
  await page.getByRole("button", { name: "Join list", exact: true }).click();
  await expect(page).toHaveURL(/\/lists\/shared\?joined=1$/);
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "Invitation accepted",
  );
};

const memberCard = (page: Page, username: string) =>
  page.getByRole("listitem").filter({
    has: page.getByRole("heading", {
      name: new RegExp(`^${username}( \\(you\\))?$`),
    }),
  });
const confirmAction = async (scope: Locator, button: string) => {
  const form = scope.locator("form").filter({
    has: scope.page().getByRole("button", { name: button, exact: true }),
  });
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: button, exact: true }).click();
};

test.beforeEach(async () => {
  await resetFixtures();
  await fetch(`${testEnvironment.MAILPIT_URL}/api/v1/messages`, {
    method: "DELETE",
  });
  const prisma = testPrisma();
  try {
    await prisma.premiumGrant.create({
      data: {
        userId: "e2e-owner",
        startsAt: new Date(Date.now() - 86400000),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    await prisma.wishlist.create({
      data: {
        id: "e2e-collaboration",
        title,
        ownerId: "e2e-owner",
        visibility: "PRIVATE",
        publication: "PUBLISHED",
        reservationsEnabled: true,
        memberships: { create: { userId: "e2e-owner", role: "ADMIN" } },
        wishes: {
          create: {
            id: "e2e-collaboration-wish",
            title: "Secret gift",
            authorId: "e2e-owner",
          },
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
});

test("private creation, email invitation, member access, reservation and removal", async ({
  page,
  browser,
  request,
}) => {
  await signIn(page);
  await page.getByRole("link", { name: "Create a list", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("New private draft");
  await page.getByLabel("Visibility when published").selectOption("PRIVATE");
  await page.getByRole("button", { name: "Create list", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "New private draft", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Draft · Private", { exact: true }),
  ).toBeVisible();
  const invitation = await invite(page);
  const other = await browser.newPage({ baseURL: testOrigin });
  try {
    expect(await (await request.get(listUrl)).text()).not.toContain(title);
    await signIn(other, accounts.member, invitation);
    await expect(
      other.getByRole("button", { name: "Join list" }),
    ).toBeVisible();
    await expect(other.getByText(title, { exact: true })).toHaveCount(0);
    await join(other);
    await other.getByRole("link", { name: title, exact: true }).click();
    await expect(
      other.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      other.getByRole("link", { name: "Edit list", exact: true }),
    ).toHaveCount(0);
    await other.goto(`${listUrl}/wishes/e2e-collaboration-wish`);
    await other
      .getByRole("button", { name: "Reserve wish", exact: true })
      .click();
    await expect(
      other.getByRole("button", { name: "Cancel reservation", exact: true }),
    ).toBeVisible();
    await page.reload();
    await confirmAction(memberCard(page, "e2e-member"), "Remove member");
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      "Member removed",
    );
    await other.reload();
    await expect(
      other.getByRole("heading", { name: "Secret gift", exact: true }),
    ).toHaveCount(0);
    await other.goto("/reservations");
    await expect(
      other.getByRole("link", { name: "Secret gift", exact: true }),
    ).toHaveCount(0);
    await other.goto(invitation);
    await expect(
      other.getByText(/This invitation is unavailable/),
    ).toBeVisible();
  } finally {
    await other.close();
  }
});

test("new invitees register and verify the intended email, then explicitly join", async ({
  page,
  browser,
}) => {
  await signIn(page);
  const invitation = await invite(page, newAccount.email);
  const other = await browser.newPage({ baseURL: testOrigin });
  try {
    await other.goto(invitation);
    await other
      .getByRole("link", { name: "Create an account", exact: true })
      .click();
    await other
      .getByLabel("Username", { exact: true })
      .fill(newAccount.username);
    await other.getByLabel("Email", { exact: true }).fill(newAccount.email);
    await other
      .getByLabel("Password", { exact: true })
      .fill(newAccount.password);
    await other
      .getByLabel("Confirm password", { exact: true })
      .fill(newAccount.password);
    await other
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(other).toHaveURL(/\/email-verification\?returnTo=/);
    await other
      .getByLabel("Verification code")
      .fill((await latestMail()).Text.match(/\b[A-Z]{8}\b/)![0]);
    await other
      .getByRole("button", { name: "Verify email", exact: true })
      .click();
    await expect(other).toHaveURL(invitation);
    await expect(
      other.getByRole("button", { name: "Join list", exact: true }),
    ).toBeVisible();
    await join(other);
    await expect(
      other.getByRole("link", { name: title, exact: true }),
    ).toBeVisible();
  } finally {
    await other.close();
  }
});

test("wrong accounts cannot inspect invitations; revocation invalidates an open acceptance form", async ({
  page,
  browser,
}) => {
  await signIn(page);
  const invitation = await invite(page);
  const other = await browser.newPage({ baseURL: testOrigin });
  try {
    await signIn(other, accounts.member, invitation);
    await page.goto(invitation);
    await expect(
      page.getByText(/This invitation is unavailable/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Join list", exact: true }),
    ).toHaveCount(0);
    await page.goto(sharingUrl);
    await page
      .getByRole("button", { name: "Revoke invitation", exact: true })
      .click();
    await expect(
      page.getByText("No pending invitations on this page."),
    ).toBeVisible();
    await other.getByRole("checkbox", { name: /I want to join/ }).check();
    await other.getByRole("button", { name: "Join list", exact: true }).click();
    await expect(other.getByRole("main").getByRole("alert")).toContainText(
      "unavailable",
    );
    await expect(other.getByRole("main").getByRole("alert")).toBeFocused();
  } finally {
    await other.close();
  }
});

test("admin promotion, owner transfer and leaving use current ownership and Premium", async ({
  page,
  browser,
}, info) => {
  await signIn(page);
  const invitation = await invite(page);
  const other = await browser.newPage({ baseURL: testOrigin });
  try {
    await signIn(other, accounts.member, invitation);
    await join(other);
    await page.reload();
    await confirmAction(memberCard(page, "e2e-member"), "Make admin");
    await expect(
      memberCard(page, "e2e-member").getByRole("button", {
        name: "Make member",
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath("sharing-members.png"),
      fullPage: true,
      scale: "css",
    });
    await other.goto(sharingUrl);
    await expect(
      other.getByRole("button", { name: "Transfer ownership", exact: true }),
    ).toHaveCount(0);
    await expect(
      other.getByRole("button", { name: "Send invitation", exact: true }),
    ).toBeVisible();
    await confirmAction(memberCard(page, "e2e-member"), "Transfer ownership");
    await expect(memberCard(page, "e2e-member")).toContainText("Owner · Admin");
    await expect(
      page.getByRole("button", { name: "Send invitation", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText(/The owner needs Premium/)).toBeVisible();
    await other.reload();
    await expect(
      memberCard(other, "e2e-member").getByRole("button", {
        name: "Leave list",
        exact: true,
      }),
    ).toHaveCount(0);
    await confirmAction(memberCard(page, "e2e-owner"), "Leave list");
    await expect(page).toHaveURL(/\/lists\/shared\?left=1$/);
    await page.goto(listUrl);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toHaveCount(0);
    await other.goto(listUrl);
    await expect(
      other.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  } finally {
    await other.close();
  }
});

test("Premium expiry rejects stale invitations and admin forms while existing membership remains", async ({
  page,
  browser,
}) => {
  await signIn(page);
  const invitation = await invite(page, accounts.member.email, "ADMIN");
  const other = await browser.newPage({ baseURL: testOrigin });
  const prisma = testPrisma();
  try {
    await signIn(other, accounts.member, invitation);
    await prisma.premiumGrant.updateMany({
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    await other.getByRole("checkbox", { name: /I want to join/ }).check();
    await other.getByRole("button", { name: "Join list", exact: true }).click();
    await expect(other.getByRole("main").getByRole("alert")).toContainText(
      "Active Premium",
    );
    await page.getByLabel("Invitation email").fill("another@example.test");
    await page
      .getByRole("button", { name: "Send invitation", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Active Premium",
    );
    await prisma.premiumGrant.updateMany({
      data: { expiresAt: new Date(Date.now() + 86400000) },
    });
    await other.reload();
    await join(other);
    await other.goto(sharingUrl);
    await prisma.membership.updateMany({
      where: { wishlistId: "e2e-collaboration", userId: "e2e-member" },
      data: { role: "MEMBER" },
    });
    await other.getByLabel("Invitation email").fill("spoof@example.test");
    await other
      .getByRole("button", { name: "Send invitation", exact: true })
      .click();
    await expect(other.getByRole("main").getByRole("alert")).toContainText(
      "permission",
    );
    await prisma.premiumGrant.updateMany({
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    await other.goto(listUrl);
    await expect(
      other.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  } finally {
    await prisma.$disconnect();
    await other.close();
  }
});

test("sharing and visibility controls support keyboard use at 320px in dark mode", async ({
  page,
  request,
}, info) => {
  await signIn(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto(sharingUrl);
  await page
    .getByLabel("Invitation email")
    .fill("long-recipient-address-for-layout@example.test");
  await page
    .getByRole("button", { name: "Send invitation", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Invitation created");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("sharing-narrow-dark.png"),
    fullPage: true,
    scale: "css",
  });
  await confirmAction(page.getByRole("main"), "Make public");
  await expect(
    page.getByRole("button", { name: "Make private", exact: true }),
  ).toBeVisible();
  expect(await (await request.get(listUrl)).text()).toContain(title);
  await confirmAction(page.getByRole("main"), "Make private");
  await expect(
    page.getByRole("button", { name: "Make public", exact: true }),
  ).toBeVisible();
  expect(await (await request.get(listUrl)).text()).not.toContain(title);
});
