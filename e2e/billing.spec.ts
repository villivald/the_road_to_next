import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import {
  completePayment,
  emptyPaddleState,
  type PaddleState,
} from "./paddle-fixture";
import { accounts, resetFixtures, testPrisma } from "./seed";

const providerState = async () =>
  JSON.parse(await readFile(".local/paddle-test.json", "utf8")) as PaddleState;
const save = (state: PaddleState) =>
  writeFile(".local/paddle-test.json", JSON.stringify(state));

test.beforeEach(async ({ page }) => {
  await resetFixtures();
  await save(emptyPaddleState());
  await page.route("https://cdn.paddle.com/paddle/v2/paddle.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.Paddle={Environment:{set:()=>{}},Initialize:(options)=>{window.paddleTestEvent=options.eventCallback},Checkout:{open:()=>{document.body.dataset.checkoutOpened='true'}}};`,
    }),
  );
  await page.goto("/en/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(accounts.owner.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(accounts.owner.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/lists$/);
  await page.goto("/en/account/plan");
});

const choose = async (
  page: import("@playwright/test").Page,
  interval = "monthly",
) => {
  await page
    .getByRole("checkbox", {
      name: new RegExp(`automatic ${interval} renewal`),
    })
    .check();
  await page
    .getByRole("button", { name: `Choose ${interval}`, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Premium checkout", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open secure checkout", exact: true })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-checkout-opened",
    "true",
  );
};
const refresh = async (page: import("@playwright/test").Page) => {
  await page
    .getByRole("button", { name: "Refresh billing", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Billing status" }),
  ).toContainText("Billing details are up to date");
};

test("checkout return checks Paddle automatically without trusting the return URL", async ({
  page,
  browser,
}, info) => {
  await choose(page);
  const checkoutUrl = page.url();
  const other = await browser.newPage();
  try {
    await other.goto(checkoutUrl);
    await expect(other).toHaveURL(/sign-in/);
  } finally {
    await other.close();
  }
  await page.goto("/en/account/plan?checkout=returned");
  await expect(
    page.getByRole("heading", { name: "Free", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Checking your payment", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Discard checkout", exact: true }),
  ).toHaveCount(0);
  const state = await providerState();
  completePayment(state, state.transactions[0].id);
  await save(state);
  await expect(
    page.getByRole("heading", { name: "Premium", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByText("Auto-renewal on", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Discard checkout", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Payment confirmed. Your Premium access is ready."),
  ).toBeVisible();
  expect((await providerState()).createCount).toBe(1);
  await page.goto(checkoutUrl);
  await expect(page).toHaveURL(/account\/plan\?checkout=returned/);
  await expect(
    page.getByRole("button", { name: "Choose monthly", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("billing-active.png"),
    fullPage: true,
    scale: "css",
  });
  const scheduled = await providerState();
  scheduled.subscriptions[0].scheduled_change = {
    action: "cancel",
    effective_at: scheduled.transactions[0].billing_period!.ends_at,
  };
  scheduled.subscriptions[0].next_billed_at = null;
  scheduled.subscriptions[0].updated_at = new Date().toISOString();
  await save(scheduled);
  await page.reload();
  await expect(
    page.getByText("Renewal canceled", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Subscription ends on/)).toBeVisible();
  await expect(
    page.getByText(
      "This subscription will not renew. Your remaining paid access stays available.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText(/Next payment:/)).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Premium", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Choose monthly", exact: true }),
  ).toHaveCount(0);
  await page.goto("/fi/account/plan");
  await expect(
    page.getByText("Automaattinen uusiminen peruttu", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Tilaus ei uusiudu automaattisesti. Jäljellä oleva maksettu käyttöaikasi säilyy.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.goto("/en/account/plan");
  await page.route("https://sandbox-customer-portal.paddle.com/**", (route) =>
    route.fulfill({
      body: "<h1>Paddle customer portal fixture</h1>",
      contentType: "text/html",
    }),
  );
  await page
    .getByRole("button", { name: "Manage subscription", exact: true })
    .click();
  await expect(page).toHaveURL(/sandbox-customer-portal.paddle.com/);
  expect(new URL(page.url()).searchParams.get("action")).toBe(
    "view_subscription",
  );
});

test("checkout return falls back to manual controls when Paddle is unavailable, in Finnish", async ({
  page,
}) => {
  await choose(page);
  const state = await providerState();
  state.fail = true;
  await save(state);
  await page.goto("/fi/account/plan?checkout=returned");
  await expect(
    page.getByRole("heading", {
      name: "Maksua ei ole vielä vahvistettu",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Maksutietojen tila" }),
  ).toContainText("Paddle ei ole juuri nyt käytettävissä");
  await expect(
    page.getByRole("link", { name: "Jatka maksamista", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Päivitä maksutiedot", exact: true }),
  ).toBeVisible();
  expect((await providerState()).createCount).toBe(1);
});

test("returning focus to the plan page picks up cancellation without another payment", async ({
  page,
}) => {
  await choose(page);
  const state = await providerState();
  completePayment(state, state.transactions[0].id);
  await save(state);
  const synced = page.waitForResponse(
    (response) =>
      response.url().includes("/account/plan") &&
      response.request().method() === "POST",
  );
  await page.goto("/en/account/plan?checkout=returned");
  await synced;
  await expect(
    page.getByText("Auto-renewal on", { exact: true }),
  ).toBeVisible();

  const canceled = await providerState();
  canceled.subscriptions[0].scheduled_change = {
    action: "cancel",
    effective_at: canceled.transactions[0].billing_period!.ends_at,
  };
  canceled.subscriptions[0].next_billed_at = null;
  canceled.subscriptions[0].updated_at = new Date().toISOString();
  await save(canceled);
  await page.clock.install();
  await page.clock.fastForward(6000);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByText("Renewal canceled", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Next payment:/)).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Premium", exact: true }),
  ).toBeVisible();
  expect((await providerState()).createCount).toBe(1);
});

test("abandoned checkouts can be resumed or discarded before selecting the annual plan", async ({
  page,
}) => {
  await choose(page);
  await page.goto("/en/account/plan");
  await page
    .getByRole("button", { name: "Discard checkout", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Choose annual", exact: true }),
  ).toBeVisible();
  await choose(page, "annual");
  const state = await providerState();
  expect(state.createCount).toBe(2);
  expect(state.transactions[0].status).toBe("canceled");
  expect(state.transactions[1].details?.totals.total).toBe("1500");
});

test("refunds remove paid access and provider outages have recoverable feedback", async ({
  page,
}) => {
  await choose(page);
  const state = await providerState();
  completePayment(state, state.transactions[0].id);
  await save(state);
  await page.goto("/en/account/plan");
  await refresh(page);
  state.fail = true;
  await save(state);
  await page
    .getByRole("button", { name: "Refresh billing", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Billing status" }),
  ).toContainText("unavailable");
  state.fail = false;
  state.transactions[0].adjustments = [
    { action: "refund", status: "approved", totals: { total: "200" } },
  ];
  await save(state);
  await refresh(page);
  await expect(
    page.getByRole("heading", { name: "Free", exact: true }),
  ).toBeVisible();
});

test("subscription controls fit a 320px dark layout and work with the keyboard", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page
    .getByRole("checkbox", { name: /automatic annual renewal/ })
    .focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("checkbox", { name: /automatic annual renewal/ }),
  ).toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("billing-narrow-dark.png"),
    fullPage: true,
    scale: "css",
  });
  await page
    .getByRole("button", { name: "Choose annual", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Premium checkout", exact: true }),
  ).toBeVisible();
  const prisma = testPrisma();
  try {
    await prisma.session.deleteMany({ where: { userId: "e2e-owner" } });
    await page.reload();
    await expect(page).toHaveURL(/sign-in/);
  } finally {
    await prisma.$disconnect();
  }
});

test("plan choices are accessible in English and Finnish at desktop and narrow dark widths", async ({
  page,
}, info) => {
  await expect(
    page.getByText("Save €9 a year compared with monthly billing."),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include("main").analyze()).violations,
  ).toEqual([]);
  await page.screenshot({
    path: info.outputPath("billing-pricing.png"),
    fullPage: true,
    scale: "css",
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/fi/account/plan");
  await expect(
    page.getByText("Säästät 9 € vuodessa kuukausitilaukseen verrattuna."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include("main").analyze()).violations,
  ).toEqual([]);
  await page.screenshot({
    path: info.outputPath("billing-finnish-dark.png"),
    fullPage: true,
    scale: "css",
  });
});

test("closing and reopening the payment window keeps the same checkout", async ({
  page,
}) => {
  await choose(page);
  await page.evaluate(() => {
    const browser = window as Window & {
      paddleTestEvent?: (event: { name: string }) => void;
    };
    browser.paddleTestEvent!({ name: "checkout.closed" });
  });
  await expect(page.getByRole("status")).toContainText("Payment window closed");
  await page
    .getByRole("button", { name: "Open secure checkout", exact: true })
    .click();
  expect((await providerState()).createCount).toBe(1);
  await page.evaluate(() => {
    const browser = window as Window & {
      paddleTestEvent?: (event: { name: string }) => void;
    };
    browser.paddleTestEvent!({ name: "checkout.completed" });
  });
  await expect(page).toHaveURL(/account\/plan\?checkout=returned/);
  await expect(
    page.getByRole("heading", { name: "Free", exact: true }),
  ).toBeVisible();
  const state = await providerState();
  completePayment(state, state.transactions[0].id);
  await save(state);
  await expect(
    page.getByRole("heading", { name: "Premium", exact: true }),
  ).toBeVisible({ timeout: 15000 });
});

test("overdue and paused subscriptions explain the next action while preserving paid access", async ({
  page,
}, info) => {
  await choose(page);
  const state = await providerState();
  completePayment(state, state.transactions[0].id);
  await save(state);
  await page.goto("/en/account/plan?checkout=returned");
  await expect(
    page.getByText("Auto-renewal on", { exact: true }),
  ).toBeVisible();
  const overdue = await providerState();
  overdue.subscriptions[0].status = "past_due";
  overdue.subscriptions[0].updated_at = new Date().toISOString();
  await save(overdue);
  await refresh(page);
  await expect(
    page.getByText("Payment overdue", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Paddle could not collect a payment/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Premium", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("billing-overdue.png"),
    fullPage: true,
    scale: "css",
  });
  const paused = await providerState();
  paused.subscriptions[0].status = "paused";
  paused.subscriptions[0].updated_at = new Date().toISOString();
  await save(paused);
  await refresh(page);
  await expect(page.getByText(/Payments are paused/)).toBeVisible();
  await expect(page.getByText(/Next payment:/)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Choose annual", exact: true }),
  ).toHaveCount(0);
});
