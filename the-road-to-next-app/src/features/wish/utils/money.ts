export const currencies = ["EUR", "USD", "GBP"] as const;

export type WishCurrency = (typeof currencies)[number];

export const MAX_PRICE_MINOR = 2_147_483_647;

export const parsePriceMinor = (value: string): number | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (!/^\d+(?:[.,]\d{1,2})?$/.test(trimmed)) {
    throw new Error(
      "Use a non-negative price with at most two decimal places.",
    );
  }

  const [whole, fraction = ""] = trimmed.split(/[.,]/);
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  if (!Number.isSafeInteger(amount) || amount > MAX_PRICE_MINOR) {
    throw new Error("Use a price no higher than 21,474,836.47.");
  }

  return amount;
};

export const priceInputValue = (amount: number | null) =>
  amount === null ? "" : (amount / 100).toFixed(2);

export const formatWishPrice = (
  amount: number | null,
  currency: WishCurrency | null,
) => {
  if (amount === null || currency === null) {
    return "No price added";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(amount / 100);
};
