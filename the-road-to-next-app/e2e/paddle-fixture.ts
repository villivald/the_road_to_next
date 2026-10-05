import type {
  PaddleSubscription,
  PaddleTransaction,
} from "../src/features/billing/service/paddle";

export const paddleEnvironment = {
  PADDLE_ENVIRONMENT: "sandbox",
  PADDLE_API_KEY: "pdl_sdbx_apikey_fixture_only",
  PADDLE_CLIENT_TOKEN: "test_fixture_only",
  PADDLE_WEBHOOK_SECRET: "fixture-signing-secret",
  PADDLE_MONTHLY_PRICE_ID: `pri_${"m".repeat(26)}`,
  PADDLE_ANNUAL_PRICE_ID: `pri_${"y".repeat(26)}`,
};

type Customer = {
  id: string;
  email: string;
  custom_data: { wishlist_account: string };
};
export type PaddleState = {
  customers: Customer[];
  transactions: PaddleTransaction[];
  subscriptions: PaddleSubscription[];
  fail: boolean;
  loseCreateResponse: boolean;
  createCount: number;
};
export const emptyPaddleState = (): PaddleState => ({
  customers: [],
  transactions: [],
  subscriptions: [],
  fail: false,
  loseCreateResponse: false,
  createCount: 0,
});
const id = (prefix: string, value: number) =>
  `${prefix}_${String(value).padStart(26, "0")}`;

export const completePayment = (state: PaddleState, transactionId: string) => {
  const transaction = state.transactions.find(
    (item) => item.id === transactionId,
  )!;
  const annual =
    transaction.items[0].price.id === paddleEnvironment.PADDLE_ANNUAL_PRICE_ID;
  transaction.status = "completed";
  transaction.subscription_id = id("sub", state.subscriptions.length + 1);
  transaction.billing_period = {
    starts_at: new Date(Date.now() - 1000).toISOString(),
    ends_at: new Date(
      Date.now() + (annual ? 365 : 30) * 86400000,
    ).toISOString(),
  };
  state.subscriptions.push({
    id: transaction.subscription_id,
    customer_id: transaction.customer_id!,
    status: "active",
    updated_at: new Date().toISOString(),
    next_billed_at: transaction.billing_period.ends_at,
    scheduled_change: null,
    custom_data: transaction.custom_data,
    items: transaction.items,
  });
};

// Test-only implementation of the documented HTTP shapes. Never imported by app code.
export const paddleFixtureResponse = (
  state: PaddleState,
  url: URL,
  init?: RequestInit,
) => {
  const method = init?.method ?? "GET";
  const data = init?.body ? JSON.parse(String(init.body)) : {};
  const path = url.pathname;
  const response = (value: unknown) =>
    Response.json({
      data: value,
      meta: { pagination: { has_more: false, next: null } },
    });
  if (state.fail) return new Response(null, { status: 503 });
  if (path.startsWith("/prices/")) {
    const annual = path.endsWith(paddleEnvironment.PADDLE_ANNUAL_PRICE_ID);
    return response({
      id: path.split("/").at(-1),
      status: "active",
      unit_price: { amount: annual ? "1500" : "200", currency_code: "EUR" },
      billing_cycle: { interval: annual ? "year" : "month", frequency: 1 },
      trial_period: null,
      tax_mode: "internal",
      quantity: { minimum: 1, maximum: 1 },
    });
  }
  if (path === "/customers" && method === "GET")
    return response(
      state.customers.filter(
        (customer) => customer.email === url.searchParams.get("email"),
      ),
    );
  if (path === "/customers" && method === "POST") {
    const customer = {
      id: id("ctm", state.customers.length + 1),
      ...data,
    } as Customer;
    state.customers.push(customer);
    return response(customer);
  }
  if (path.endsWith("/portal-sessions"))
    return response({
      urls: {
        general: {
          overview: "https://sandbox-customer-portal.paddle.com/cpl_fixture",
        },
      },
    });
  if (path === "/transactions" && method === "POST") {
    state.createCount++;
    const transaction: PaddleTransaction = {
      id: id("txn", state.transactions.length + 1),
      status: "draft",
      origin: "api",
      customer_id: data.customer_id,
      subscription_id: null,
      custom_data: data.custom_data,
      currency_code: data.currency_code,
      items: [
        {
          price: { id: data.items[0].price_id },
          quantity: data.items[0].quantity,
        },
      ],
      billing_period: null,
      details: {
        totals: {
          total:
            data.items[0].price_id === paddleEnvironment.PADDLE_ANNUAL_PRICE_ID
              ? "1500"
              : "200",
        },
      },
      adjustments: [],
    };
    state.transactions.push(transaction);
    if (state.loseCreateResponse) return new Response(null, { status: 503 });
    return response(transaction);
  }
  if (path === "/transactions")
    return response(
      state.transactions.filter(
        (transaction) =>
          (!url.searchParams.has("subscription_id") ||
            transaction.subscription_id ===
              url.searchParams.get("subscription_id")) &&
          (!url.searchParams.has("status") ||
            transaction.status === url.searchParams.get("status")),
      ),
    );
  if (path.startsWith("/transactions/")) {
    const transaction = state.transactions.find(
      (item) => item.id === path.split("/")[2],
    );
    if (!transaction) return new Response(null, { status: 404 });
    if (method === "PATCH") transaction.status = data.status;
    return response(transaction);
  }
  if (path.startsWith("/subscriptions/")) {
    const subscription = state.subscriptions.find(
      (item) => item.id === path.split("/")[2],
    );
    if (!subscription) return new Response(null, { status: 404 });
    if (path.endsWith("/cancel")) {
      subscription.status = "canceled";
      subscription.next_billed_at = null;
      subscription.scheduled_change = null;
      subscription.updated_at = new Date().toISOString();
    }
    return response(subscription);
  }
  throw new Error(`Unexpected fixture endpoint: ${method} ${path}`);
};
