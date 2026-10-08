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
      body: `window.Paddle={Environment:{set:()=>{}},Initialize:()=>{},Checkout:{open:()=>{document.body.dataset.checkoutOpened='true'}}};`,
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
  await expect(page.getByRole("status")).toContainText("Billing updated");
};

test("checkout is server-bound, returns never grant access, confirmation and cancellation appear after refresh", async ({
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
    page.getByRole("link", { name: "Resume checkout", exact: true }),
  ).toBeVisible();
  const state = await providerState();
  completePayment(state, state.transactions[0].id);
  await save(state);
  await refresh(page);
  await expect(
    page.getByRole("heading", { name: "Premium", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Status: active", { exact: true })).toBeVisible();
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
  scheduled.subscriptions[0].updated_at = new Date().toISOString();
  await save(scheduled);
  await refresh(page);
  await expect(page.getByText(/Cancellation scheduled for/)).toBeVisible();
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
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "unavailable",
  );
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
