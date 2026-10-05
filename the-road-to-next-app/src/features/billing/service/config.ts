import { AuthError } from "@/features/auth/service/security";

export class BillingError extends AuthError {}

export const plans = {
  month: { label: "Monthly", amount: "200", display: "€2 / month" },
  year: { label: "Annual", amount: "1500", display: "€15 / year" },
} as const;
export type BillingInterval = keyof typeof plans;

// Live payments require a separate release decision and are intentionally rejected.
export const billingConfig = () => {
  const apiKey = process.env.PADDLE_API_KEY;
  const clientToken = process.env.PADDLE_CLIENT_TOKEN;
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  const month = process.env.PADDLE_MONTHLY_PRICE_ID;
  const year = process.env.PADDLE_ANNUAL_PRICE_ID;

  if (
    process.env.PADDLE_ENVIRONMENT !== "sandbox" ||
    !apiKey?.includes("_sdbx_") ||
    !clientToken?.startsWith("test_") ||
    !webhookSecret ||
    !/^pri_[a-z0-9]{26}$/.test(month ?? "") ||
    !/^pri_[a-z0-9]{26}$/.test(year ?? "") ||
    month === year
  ) {
    throw new BillingError(
      "Subscriptions are not configured yet. Promo codes still work.",
    );
  }

  return {
    apiKey,
    clientToken,
    webhookSecret,
    prices: { month: month!, year: year! },
    origin: "https://sandbox-api.paddle.com",
  };
};

export const billingEnabled = () => {
  try {
    billingConfig();
    return true;
  } catch {
    return false;
  }
};
