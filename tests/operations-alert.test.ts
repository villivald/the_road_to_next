import { afterEach, expect, it, vi } from "vitest";
import { sendOperationsFailureAlert } from "@/features/operations/service/failure-alert";

const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/lib/mail", () => ({ deliverRenderedEmail: mocks.send }));
afterEach(() => vi.unstubAllEnvs());

const failure = {
  function_id: "wishlist-cleanup-media",
  run_id: "01J-opaque-run",
  error: { message: "private-provider-secret" },
  event: { data: { email: "customer@example.test" } },
};

it("is disabled until an operator address is configured", async () => {
  vi.stubEnv("OPERATIONS_ALERT_EMAIL", "");
  expect(await sendOperationsFailureAlert(failure)).toEqual({
    sent: false,
    reason: "disabled",
  });
  expect(mocks.send).not.toHaveBeenCalled();
});

it("sends only job/run metadata with a stable delivery idempotency key", async () => {
  vi.stubEnv("OPERATIONS_ALERT_EMAIL", "support@example.test");
  mocks.send.mockResolvedValue({ error: null });
  await sendOperationsFailureAlert(failure);
  const [message, key] = mocks.send.mock.calls[0];
  expect(message.to).toBe("support@example.test");
  expect(message.text).toContain("01J-opaque-run");
  expect(JSON.stringify(message)).not.toMatch(
    /customer@example|private-provider-secret/,
  );
  expect(key).toBe("operations-failure/wishlist-cleanup-media/01J-opaque-run");
});

it.each(["wishlist-operations-failure-alert", "another-app-cleanup-media"])(
  "ignores its own failures and other apps: %s",
  async (functionId) => {
    vi.stubEnv("OPERATIONS_ALERT_EMAIL", "support@example.test");
    expect(
      await sendOperationsFailureAlert({ ...failure, function_id: functionId }),
    ).toMatchObject({ sent: false, reason: "ignored" });
    expect(mocks.send).not.toHaveBeenCalled();
  },
);

it("rejects unsafe run identifiers and invalid configuration", async () => {
  vi.stubEnv("OPERATIONS_ALERT_EMAIL", "support@example.test");
  expect(
    await sendOperationsFailureAlert({ ...failure, run_id: "<script>" }),
  ).toMatchObject({ sent: false });
  vi.stubEnv("OPERATIONS_ALERT_EMAIL", "invalid");
  await expect(sendOperationsFailureAlert(failure)).rejects.toThrow(
    "valid operations alert address",
  );
  expect(mocks.send).not.toHaveBeenCalled();
});

it("propagates delivery failure so Inngest can retry", async () => {
  vi.stubEnv("OPERATIONS_ALERT_EMAIL", "support@example.test");
  mocks.send.mockRejectedValue(new Error("Delivery unavailable"));
  await expect(sendOperationsFailureAlert(failure)).rejects.toThrow(
    "Delivery unavailable",
  );
});
