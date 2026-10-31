import { AuthError } from "@/features/auth/service/security";

export class BillingError extends AuthError {}

export const plans = {
  month: { label: "Monthly", amount: "200", display: "€2 / month" },
  year: { label: "Annual", amount: "1500", display: "€15 / year" },
} as const;
export type BillingInterval = keyof typeof plans;

export type BillingEnvironment = "sandbox" | "live";
export const billingEnvironments = ["sandbox", "live"] as const;
export const billingEnvironment = (): BillingEnvironment | null => {
  const value = process.env.PADDLE_ENVIRONMENT;
  return value === "sandbox" || value === "live" ? value : null;
};

// Primary settings belong only to the explicitly selected environment. Optional
// prefixed settings keep the other environment's durable recovery operational.
export const billingConfig = (environment = billingEnvironment()) => {
  const setting = (name: string) =>
    process.env[
      environment === billingEnvironment()
        ? `PADDLE_${name}`
        : `PADDLE_${environment?.toUpperCase()}_${name}`
    ];
  const apiKey = setting("API_KEY");
  const clientToken = setting("CLIENT_TOKEN");
  const webhookSecret = setting("WEBHOOK_SECRET");
  const month = setting("MONTHLY_PRICE_ID");
  const year = setting("ANNUAL_PRICE_ID");

  if (
    !environment ||
    !apiKey?.startsWith(
      `pdl_${environment === "sandbox" ? "sdbx" : "live"}_apikey_`,
    ) ||
    !clientToken?.startsWith(environment === "sandbox" ? "test_" : "live_") ||
    !webhookSecret ||
    !/^pri_[a-z0-9]{26}$/.test(month ?? "") ||
    !/^pri_[a-z0-9]{26}$/.test(year ?? "") ||
    month === year
  ) {
    throw new BillingError(
      "Subscriptions are not available yet. You can still use a promo code.",
    );
  }

  return {
    environment,
    apiKey,
    clientToken,
    webhookSecret,
    prices: { month: month!, year: year! },
    origin:
      environment === "sandbox"
        ? "https://sandbox-api.paddle.com"
        : "https://api.paddle.com",
    portalHostname:
      environment === "sandbox"
        ? "sandbox-customer-portal.paddle.com"
        : "customer-portal.paddle.com",
  };
};

export const billingEnabled = (environment = billingEnvironment()) => {
  try {
    billingConfig(environment);
    return true;
  } catch {
    return false;
  }
};

// Pause new checkout independently of reconciliation, refunds and cancellation.
// Sandbox keeps its existing default; live sales require a deliberate opt-in.
export const billingCheckoutEnabled = (userId?: string) => {
  const testers = process.env.PADDLE_CHECKOUT_TESTER_IDS?.trim();
  return (
    billingEnabled() &&
    (billingEnvironment() === "live"
      ? process.env.PADDLE_CHECKOUT_ENABLED === "1"
      : process.env.PADDLE_CHECKOUT_ENABLED !== "0") &&
    (!testers ||
      (!!userId && testers.split(",").some((id) => id.trim() === userId)))
  );
};
