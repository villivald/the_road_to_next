import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  billingConfig,
  billingEnabled,
} from "@/features/billing/service/config";
import {
  fullyRefunded,
  paddleRequest,
  PaddleRequestError,
  transactionSchema,
} from "@/features/billing/service/paddle";
import { validSignature } from "@/features/billing/service/webhook";
import {
  emptyPaddleState,
  paddleEnvironment,
  paddleFixtureResponse,
} from "../e2e/paddle-fixture";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const configure = () =>
  Object.entries(paddleEnvironment).forEach(([key, value]) =>
    vi.stubEnv(key, value),
  );

describe("Paddle boundaries", () => {
  it("requires sandbox configuration and rejects live credentials", () => {
    configure();
    expect(billingConfig().origin).toBe("https://sandbox-api.paddle.com");
    vi.stubEnv("PADDLE_ENVIRONMENT", "live");
    expect(billingEnabled()).toBe(false);
    vi.stubEnv("PADDLE_ENVIRONMENT", "sandbox");
    vi.stubEnv("PADDLE_API_KEY", "pdl_live_apikey_secret");
    expect(billingEnabled()).toBe(false);
  });
  it("validates raw bytes, timestamp, and multiple rotating signature hashes", () => {
    const body = Buffer.from('{"example":true}');
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", "secret")
      .update(`${timestamp}:`)
      .update(body)
      .digest("hex");
    expect(
      validSignature(
        body,
        `ts=${timestamp};h1=${"0".repeat(64)};h1=${signature}`,
        "secret",
      ),
    ).toBe(true);
    expect(
      validSignature(
        Buffer.from('{ "example":true}'),
        `ts=${timestamp};h1=${signature}`,
        "secret",
      ),
    ).toBe(false);
    expect(
      validSignature(
        body,
        `ts=${timestamp};h1=${signature}`,
        "secret",
        Date.now() + 6000,
      ),
    ).toBe(false);
    expect(
      validSignature(
        body,
        `ts=${timestamp};ts=${timestamp};h1=${signature}`,
        "secret",
      ),
    ).toBe(false);
    expect(validSignature(body, `ts=${timestamp};h1=wrong`, "secret")).toBe(
      false,
    );
    expect(
      validSignature(body, `ts=${timestamp};h1=${signature}`, "other"),
    ).toBe(false);
  });
  it("does not send API credentials to pagination URLs outside Paddle", async () => {
    configure();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      paddleRequest("https://foreign.example/transactions"),
    ).rejects.toThrow("destination");
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([400, 403, 422, 429, 503])(
    "classifies HTTP %s and logs only safe Paddle diagnostics",
    async (status) => {
      configure();
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          Response.json(
            {
              error: {
                code: "transaction_default_checkout_url_not_set",
                detail: "Private recipient@example.test and credentials",
              },
              meta: { request_id: "d7fac180-71b7-414d-b89d-6628329b178d" },
            },
            { status },
          ),
        ),
      );

      const error = await paddleRequest("/transactions", "POST", {}).catch(
        (error: unknown) => error,
      );
      expect(error).toBeInstanceOf(PaddleRequestError);
      expect(error).toMatchObject({
        status,
        rejected: [400, 403, 422].includes(status),
      });
      expect(log).toHaveBeenCalledWith("Paddle request failed", {
        status,
        method: "POST",
        resource: "transactions",
        code: "transaction_default_checkout_url_not_set",
        requestId: "d7fac180-71b7-414d-b89d-6628329b178d",
      });
      expect(JSON.stringify(log.mock.calls)).not.toContain("Private");
      expect(JSON.stringify(log.mock.calls)).not.toContain(
        "recipient@example.test",
      );
    },
  );
  it("handles partial, pending, full, cumulative and reversed refunds independently", async () => {
    const state = emptyPaddleState();
    const response = paddleFixtureResponse(
      state,
      new URL("https://sandbox-api.paddle.com/transactions"),
      {
        method: "POST",
        body: JSON.stringify({
          customer_id: "ctm_test",
          custom_data: { wishlist_checkout: "test" },
          currency_code: "EUR",
          items: [
            {
              price_id: paddleEnvironment.PADDLE_MONTHLY_PRICE_ID,
              quantity: 1,
            },
          ],
        }),
      },
    );
    const transaction = transactionSchema.parse((await response.json()).data);
    const refund = (amount: string, status = "approved") => ({
      action: "refund",
      status,
      totals: { total: amount },
    });
    transaction.adjustments = [refund("200", "pending_approval")];
    expect(fullyRefunded(transaction)).toBe(false);
    transaction.adjustments = [refund("100")];
    expect(fullyRefunded(transaction)).toBe(false);
    transaction.adjustments.push(refund("100"));
    expect(fullyRefunded(transaction)).toBe(true);
    transaction.adjustments = [
      { ...refund("200", "reversed"), action: "chargeback" },
      { ...refund("200"), action: "chargeback_reverse" },
      refund("200"),
    ];
    expect(fullyRefunded(transaction)).toBe(true);
  });
});
