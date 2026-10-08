import { expect, type Page, test } from "@playwright/test";
import { testEnvironment } from "./environment";
import { accounts, newAccount, resetFixtures, testPrisma } from "./seed";

const signIn = async (
  page: Page,
  email = accounts.owner.email,
  password = accounts.owner.password,
) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/lists$/);
};

const latestMail = async () => {
  const response = await fetch(
    `${testEnvironment.MAILPIT_URL}/api/v1/message/latest`,
  );
  expect(response.ok).toBe(true);
  return response.json() as Promise<{
    Text: string;
    HTML: string;
    To: { Address: string }[];
  }>;
};

test.beforeEach(async () => {
  await resetFixtures();
  const response = await fetch(
    `${testEnvironment.MAILPIT_URL}/api/v1/messages`,
    { method: "DELETE" },
  );
  expect(response.ok).toBe(true);
});

test("keyboard navigation and narrow dark layout", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 727 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.goto("/sign-in");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("narrow-dark.png"),
    fullPage: true,
    animations: "disabled",
    scale: "css",
  });
});

test("public shell and protected redirects", async ({ page }, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little space for your wishes." }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("home.png"),
    fullPage: true,
    animations: "disabled",
    scale: "css",
  });
  await page.goto("/lists");
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/email-verification");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("register, verify from captured email, reach empty lists, and sign out", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/sign-up");
  await page.getByLabel("Username", { exact: true }).fill(newAccount.username);
  await page
    .getByLabel("Email", { exact: true })
    .fill(newAccount.email.toUpperCase());
  await page.getByLabel("Password", { exact: true }).fill(newAccount.password);
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill(newAccount.password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/email-verification$/);
  await page.goto("/lists");
  await expect(page).toHaveURL(/\/email-verification$/);
  const message = await latestMail();
  expect(message.To[0]?.Address).toBe(newAccount.email);
  const code = message.Text.match(/\b[A-Z]{8}\b/)?.[0];
  expect(code).toBeTruthy();
  await page.getByLabel("Verification code", { exact: true }).fill("AAAAAAAA");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "This code is invalid or expired. Request a new code and try again.",
  );
  await page.getByLabel("Verification code", { exact: true }).fill(code!);
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page).toHaveURL(/\/lists$/);
  await expect(
    page.getByRole("heading", { name: "No lists yet", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("my-lists.png"),
    fullPage: true,
    animations: "disabled",
    scale: "css",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const session = (await page.context().cookies()).find(
    (cookie) => cookie.name === "session",
  );
  expect(session).toMatchObject({
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  });
  await page.getByRole("link", { name: "Account", exact: true }).click();
  await expect(page.getByRole("main")).toContainText(newAccount.email);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/lists");
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(errors).toEqual([]);
});

test("invalid credentials and database-backed attempt limits", async ({
  page,
}) => {
  await page.goto("/sign-in");
  for (let attempt = 0; attempt < 11; attempt++) {
    await page.getByLabel("Email", { exact: true }).fill(accounts.owner.email);
    await page
      .getByLabel("Password", { exact: true })
      .fill("Incorrect-password!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      attempt < 10 ? "Incorrect email or password" : "Too many attempts",
    );
  }
});

test("my lists excludes another owner's content and archived lists", async ({
  page,
}) => {
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: "No lists yet" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).not.toContainText(
    "Another person's private list",
  );
  await expect(page.getByRole("main")).not.toContainText("Archived list");
});

test("recovery uses captured email, revokes old sessions, and rejects token reuse", async ({
  page,
  browser,
}) => {
  await signIn(page);
  const recovery = await browser.newPage({ baseURL: testEnvironment.APP_URL });
  try {
    await recovery.goto("/password-forgot");
    await recovery
      .getByLabel("Email", { exact: true })
      .fill(accounts.owner.email);
    await recovery.getByRole("button", { name: "Send reset link" }).click();
    await expect(recovery.getByRole("status")).toContainText(
      "If an account matches",
    );
    const message = await latestMail();
    const link = message.Text.match(
      /http:\/\/127\.0\.0\.1:3017\/password-reset\/[a-z2-7]{32}/,
    )?.[0];
    expect(link).toBeTruthy();
    await recovery.goto(link!);
    await recovery
      .getByLabel("Password", { exact: true })
      .fill("Recovered-password!");
    await recovery
      .getByLabel("Confirm password", { exact: true })
      .fill("Recovered-password!");
    await recovery.getByRole("button", { name: "Reset password" }).click();
    await expect(recovery).toHaveURL(/\/sign-in\?reset=success$/);
    await page.reload();
    await expect(page).toHaveURL(/\/sign-in$/);
    await signIn(page, accounts.owner.email, "Recovered-password!");
    await recovery.goto(link!);
    await recovery
      .getByLabel("Password", { exact: true })
      .fill("Another-password!");
    await recovery
      .getByLabel("Confirm password", { exact: true })
      .fill("Another-password!");
    await recovery.getByRole("button", { name: "Reset password" }).click();
    await expect(recovery.getByRole("main").getByRole("alert")).toContainText(
      "This reset link is invalid or expired. Request a new link.",
    );
  } finally {
    await recovery.close();
  }
});

test("unknown recovery email gets the same neutral response without a message", async ({
  page,
}) => {
  await page.goto("/password-forgot");
  await page.getByLabel("Email", { exact: true }).fill("missing@example.test");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText(
    "If an account matches that email, you will receive a reset link.",
  );
  const response = await fetch(
    `${testEnvironment.MAILPIT_URL}/api/v1/messages`,
  );
  expect((await response.json()).total).toBe(0);
});

test("password changes require the current password and sign out other sessions", async ({
  page,
  browser,
}) => {
  await signIn(page);
  const other = await browser.newPage({ baseURL: testEnvironment.APP_URL });
  try {
    await signIn(other);
    await page.goto("/account/password");
    await page
      .getByLabel("Current password", { exact: true })
      .fill(accounts.owner.password);
    await page
      .getByLabel("New password", { exact: true })
      .fill("Changed-password!");
    await page
      .getByLabel("Confirm password", { exact: true })
      .fill("Changed-password!");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByRole("status")).toContainText("Password changed");
    await other.reload();
    await expect(other).toHaveURL(/\/sign-in$/);
    await page.goto("/lists");
    await expect(page).toHaveURL(/\/lists$/);
  } finally {
    await other.close();
  }
});

test("legacy routes cannot expose data; expired sessions are denied", async ({
  page,
  request,
}) => {
  for (const path of [
    "/api/tickets",
    "/api/tickets/e2e-ticket",
    "/api/aws/s3/attachments/old",
    "/organization",
    "/tickets",
    "/email-invitation/old",
    "/onboarding",
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
  }
  await signIn(page);
  const prisma = testPrisma();
  try {
    await prisma.session.updateMany({
      where: { userId: "e2e-owner" },
      data: { expiresAt: new Date(0) },
    });
  } finally {
    await prisma.$disconnect();
  }
  await page.reload();
  await expect(page).toHaveURL(/\/sign-in$/);
});
