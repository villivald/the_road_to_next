import { z } from "zod";
import {
  billingConfig,
  BillingError,
  type BillingInterval,
  plans,
} from "./config";

const date = z.iso.datetime({ offset: true });
const period = z.object({ starts_at: date, ends_at: date });
const item = z.object({
  quantity: z.number(),
  price: z.object({ id: z.string() }),
});

export const transactionSchema = z.object({
  id: z.string().regex(/^txn_[a-z0-9]{26}$/),
  status: z.string(),
  origin: z.string(),
  customer_id: z.string().nullable(),
  subscription_id: z.string().nullable(),
  custom_data: z
    .object({ wishlist_checkout: z.string() })
    .nullable()
    .catch(null),
  currency_code: z.string(),
  items: z.array(item),
  billing_period: period.nullable(),
  details: z
    .object({
      totals: z.object({ total: z.string() }),
    })
    .nullable(),
  adjustments: z
    .array(
      z.object({
        action: z.string(),
        status: z.string(),
        totals: z.object({ total: z.string() }),
      }),
    )
    .optional(),
});

export const subscriptionSchema = z.object({
  id: z.string().regex(/^sub_[a-z0-9]{26}$/),
  customer_id: z.string(),
  status: z.string(),
  updated_at: date,
  next_billed_at: date.nullable(),
  scheduled_change: z
    .object({ action: z.string(), effective_at: date })
    .nullable(),
  custom_data: z
    .object({ wishlist_checkout: z.string() })
    .nullable()
    .catch(null),
  items: z.array(item),
});

export type PaddleTransaction = z.infer<typeof transactionSchema>;
export type PaddleSubscription = z.infer<typeof subscriptionSchema>;

export class PaddleRequestError extends BillingError {
  constructor(readonly status: number) {
    super("Paddle could not complete this request. Please try again shortly.");
  }

  get rejected() {
    return [400, 401, 403, 404, 405, 422].includes(this.status);
  }
}

const responseSchema = z.object({
  data: z.unknown(),
  meta: z
    .object({
      pagination: z
        .object({ has_more: z.boolean(), next: z.string().nullable() })
        .optional(),
    })
    .optional(),
});

export const paddleRequest = async (
  path: string,
  method = "GET",
  body?: unknown,
) => {
  const config = billingConfig();
  const url = new URL(path, config.origin);
  if (url.origin !== config.origin)
    throw new BillingError("Invalid billing destination.");

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Paddle-Version": "1",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new BillingError("Paddle is unavailable. Please try again shortly.");
  }
  if (!response.ok) {
    const details = await response.json().catch(() => null);
    const code = z
      .string()
      .regex(/^[a-z][a-z0-9_]{0,127}$/)
      .safeParse(details?.error?.code);
    const requestId = z.uuid().safeParse(details?.meta?.request_id);
    console.error("Paddle request failed", {
      status: response.status,
      method,
      resource: url.pathname.split("/")[1],
      code: code.success ? code.data : undefined,
      requestId: requestId.success ? requestId.data : undefined,
    });
    throw new PaddleRequestError(response.status);
  }
  return responseSchema.parse(await response.json());
};

export const paddleList = async <T>(path: string, schema: z.ZodType<T>) => {
  const results: T[] = [];
  let next: string | null = path;
  for (let page = 0; next && page < 20; page++) {
    const response = await paddleRequest(next);
    results.push(...z.array(schema).parse(response.data));
    next = response.meta?.pagination?.has_more
      ? (response.meta.pagination.next ?? null)
      : null;
    if (response.meta?.pagination?.has_more && !next)
      throw new BillingError("Incomplete billing response.");
  }
  if (next)
    throw new BillingError("Billing history needs an administrator review.");
  return results;
};

export const getTransaction = async (id: string) =>
  transactionSchema.parse(
    (
      await paddleRequest(
        `/transactions/${encodeURIComponent(id)}?include=adjustments`,
      )
    ).data,
  );
export const getSubscription = async (id: string) =>
  subscriptionSchema.parse(
    (await paddleRequest(`/subscriptions/${encodeURIComponent(id)}`)).data,
  );

export const validatePrice = async (interval: BillingInterval) => {
  const id = billingConfig().prices[interval];
  const price = z
    .object({
      id: z.string(),
      status: z.literal("active"),
      unit_price: z.object({
        amount: z.literal(plans[interval].amount),
        currency_code: z.literal("EUR"),
      }),
      billing_cycle: z.object({
        interval: z.literal(interval),
        frequency: z.literal(1),
      }),
      trial_period: z.null(),
      tax_mode: z.literal("internal"),
      quantity: z.object({ minimum: z.literal(1), maximum: z.literal(1) }),
    })
    .safeParse((await paddleRequest(`/prices/${id}`)).data);
  if (!price.success)
    throw new BillingError(
      "The subscription price is not configured correctly. Please contact support.",
    );
  return id;
};

export const transactionPeriod = (transaction: PaddleTransaction) =>
  transaction.billing_period;

export const fullyRefunded = (transaction: PaddleTransaction) => {
  const adjustments = transaction.adjustments ?? [];
  const approved = adjustments.filter(
    (adjustment) => adjustment.status === "approved",
  );
  const refunds = approved.reduce((total, adjustment) => {
    const amount = Number(adjustment.totals.total);
    if (!Number.isSafeInteger(amount))
      throw new BillingError("Invalid adjustment amount.");
    if (["refund", "chargeback"].includes(adjustment.action))
      return total + Math.abs(amount);
    return total;
  }, 0);
  return refunds > 0 && refunds >= Number(transaction.details?.totals.total);
};
