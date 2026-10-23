import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { hashToken } from "../src/utils/crypto";
import { testEnvironment } from "./environment";
import { accounts, newAccount, resetFixtures, testPrisma } from "./seed";

// Provider browser API is deterministic; the server fixture enforces action and
// single-use tokens. Neither fixture is imported by application code.
const widgetScript = `
const widgets = new Map();
window.turnstile = {
  render(element, options) {
    const id = crypto.randomUUID();
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Complete security check';
    button.dataset.action = options.action;
    button.dataset.theme = options.theme;
    button.dataset.language = options.language;
    button.dataset.size = options.size;
    button.style.cssText = options.size === 'flexible'
      ? 'width:100%;min-width:300px;height:65px;white-space:normal'
      : 'width:150px;height:140px;white-space:normal';
    const complete = () => options.callback('fixture:' + options.action + ':' + crypto.randomUUID());
    button.addEventListener('click', complete);
    button.addEventListener('expire-challenge', options['expired-callback']);
    element.append(button);
    widgets.set(id, { element, options, complete });
    return id;
  },
  remove(id) { widgets.get(id)?.element.replaceChildren(); widgets.delete(id); },
  reset(id) { widgets.get(id)?.complete(); }
};`;

const mails = async () => {
  const response = await fetch(
    `${testEnvironment.MAILPIT_URL}/api/v1/messages`,
  );
  return ((await response.json()) as { total: number }).total;
};
const complete = async (page: Page) => {
  await page.getByRole("button", { name: "Complete security check" }).click();
  await expect(
    page.locator('input[name="cf-turnstile-response"]'),
  ).not.toHaveValue("");
};
const fillSignup = async (page: Page) => {
  await page.getByLabel("Username", { exact: true }).fill(newAccount.username);
  await page.getByLabel("Email", { exact: true }).fill(newAccount.email);
  await page.getByLabel("Password", { exact: true }).fill(newAccount.password);
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill(newAccount.password);
};

test.beforeEach(async ({ page }) => {
  await resetFixtures();
  await fetch(`${testEnvironment.MAILPIT_URL}/api/v1/messages`, {
    method: "DELETE",
  });
  await page.route(
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
    (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: widgetScript,
      }),
  );
});

test("signup rejects a missing challenge, then accepts a fresh challenge without echoing its token", async ({
  page,
}) => {
  await page.goto("/en/sign-up");
  await fillSignup(page);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Please complete the security check",
  );
  expect(await mails()).toBe(0);
  const db = testPrisma();
  try {
    expect(await db.user.count({ where: { email: newAccount.email } })).toBe(0);
  } finally {
    await db.$disconnect();
  }
  await fillSignup(page);
  await complete(page);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/email-verification$/);
  expect(await mails()).toBe(1);
  await complete(page);
  await page.getByRole("button", { name: "Send a new code" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Please wait before requesting another email",
  );
  expect(await mails()).toBe(1);
});

test("a populated honeypot cannot create an account even with a valid challenge", async ({
  page,
}) => {
  await page.goto("/en/sign-up");
  await fillSignup(page);
  await complete(page);
  await page
    .locator('input[name="website"]')
    .evaluate((input: HTMLInputElement) => {
      input.value = "https://spam.example.test";
    });
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "security check",
  );
  expect(await mails()).toBe(0);
});

test("recovery rejects cross-action and replayed tokens and keeps duplicate requests neutral", async ({
  page,
}) => {
  await page.goto("/en/sign-up");
  await complete(page);
  const signupToken = await page
    .locator('input[name="cf-turnstile-response"]')
    .inputValue();
  await page.goto("/en/password-forgot");
  await page.getByLabel("Email", { exact: true }).fill(accounts.owner.email);
  await page
    .locator('input[name="cf-turnstile-response"]')
    .evaluate((input: HTMLInputElement, value) => {
      input.value = value;
    }, signupToken);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "security check",
  );
  expect(await mails()).toBe(0);

  await page.getByLabel("Email", { exact: true }).fill(accounts.owner.email);
  await complete(page);
  const usedToken = await page
    .locator('input[name="cf-turnstile-response"]')
    .inputValue();
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText(
    "If an account matches that email",
  );
  expect(await mails()).toBe(1);

  await page.getByLabel("Email", { exact: true }).fill(accounts.owner.email);
  await page
    .locator('input[name="cf-turnstile-response"]')
    .evaluate((input: HTMLInputElement, value) => {
      input.value = value;
    }, usedToken);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "security check",
  );
  expect(await mails()).toBe(1);

  await page.getByLabel("Email", { exact: true }).fill(accounts.owner.email);
  await complete(page);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText(
    "If an account matches that email",
  );
  expect(await mails()).toBe(1);
});

test("Finnish recovery supports security-check retry, narrow dark layouts and keyboard navigation", async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/fi/password-forgot");
  await page.getByRole("button", { name: "Vaihda tummaan teemaan" }).click();
  const challenge = page.getByRole("button", {
    name: "Complete security check",
  });
  await expect(challenge).toHaveAttribute("data-language", "fi");
  await expect(challenge).toHaveAttribute("data-theme", "dark");
  await page
    .getByLabel("Sähköposti", { exact: true })
    .fill("missing@example.test");
  await challenge.focus();
  await page.keyboard.press("Enter");
  await challenge.dispatchEvent("expire-challenge");
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(
    "",
  );
  await page
    .getByRole("button", { name: "Yritä turvatarkistusta uudelleen" })
    .click();
  await expect(
    page.locator('input[name="cf-turnstile-response"]'),
  ).not.toHaveValue("");
  await challenge.focus();
  await page.keyboard.press(
    browserName === "webkit" && process.platform === "darwin"
      ? "Alt+Tab"
      : "Tab",
  );
  await expect(
    page.getByRole("button", { name: "Lähetä palautuslinkki" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText(
    "Jos sähköpostilla on tili",
  );
  expect(await mails()).toBe(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(321);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("signup source limits stop rotating identities before creating another account", async ({
  page,
}) => {
  const db = testPrisma();
  try {
    const windowMs = 15 * 60_000;
    const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
    await db.authRateLimit.createMany({
      data: [windowStart, windowStart + windowMs].map((start) => ({
        key: hashToken(`registration:source:shared:${start}`),
        attempts: 5,
        expiresAt: new Date(start + windowMs),
      })),
    });
    await page.goto("/en/sign-up");
    await fillSignup(page);
    await complete(page);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Too many attempts",
    );
    expect(await db.user.count({ where: { email: newAccount.email } })).toBe(0);
    expect(await mails()).toBe(0);
  } finally {
    await db.$disconnect();
  }
});

test("an issued reset link still submits natively without JavaScript when protection is configured", async ({
  page,
  browser,
}) => {
  await page.goto("/en/password-forgot");
  await page.getByLabel("Email", { exact: true }).fill(accounts.owner.email);
  await complete(page);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText(
    "If an account matches that email",
  );
  const response = await fetch(
    `${testEnvironment.MAILPIT_URL}/api/v1/message/latest`,
  );
  const message = (await response.json()) as { Text: string };
  const link = message.Text.match(
    /http:\/\/127\.0\.0\.1:3017\/en\/password-reset\/[a-zA-Z0-9_-]+/,
  )?.[0];
  expect(link).toBeTruthy();
  const native = await browser.newPage({
    baseURL: testEnvironment.APP_URL,
    javaScriptEnabled: false,
  });
  try {
    await native.goto(link!);
    await expect(
      native.locator('input[name="cf-turnstile-response"]'),
    ).toHaveCount(0);
    await native
      .getByLabel("Password", { exact: true })
      .fill("Recovered-fixture-password!");
    await native
      .getByLabel("Confirm password", { exact: true })
      .fill("Recovered-fixture-password!");
    await native
      .getByRole("button", { name: "Reset password", exact: true })
      .click();
    await expect(native).toHaveURL(/\/en\/sign-in\?reset=success$/);
  } finally {
    await native.close();
  }
});

test("the challenge uses the horizontal form width and safely adapts to narrow screens", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/en/password-forgot");
  const challenge = page.getByRole("button", {
    name: "Complete security check",
  });
  await expect(challenge).toHaveAttribute("data-size", "flexible");
  const field = await page.getByLabel("Email", { exact: true }).boundingBox();
  const bar = await challenge.boundingBox();
  expect(field).not.toBeNull();
  expect(bar?.height).toBe(65);
  expect(Math.abs(bar!.width - field!.width)).toBeLessThanOrEqual(1);
  await complete(page);

  await page.setViewportSize({ width: 320, height: 740 });
  await expect(challenge).toHaveAttribute("data-size", "compact");
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(
    "",
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(321);
  await complete(page);

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(challenge).toHaveAttribute("data-size", "flexible");
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(
    "",
  );
  await page.screenshot({
    path: info.outputPath("horizontal-challenge.png"),
    fullPage: true,
  });
});
