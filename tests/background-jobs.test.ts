import "@/features/billing/events/maintenance";
import "@/features/notifications/events/maintenance";
import "@/features/sharing/events/maintenance";
import "@/features/media/events/maintenance";
import "@/features/auth/events/maintenance";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  backgroundEvents,
  publishBackgroundEvents,
} from "@/lib/background-events";

type Worker = {
  triggers: ({ event: string } | { cron: string })[];
  handler: (context: {
    event: { name: string; data: unknown };
    step: { run: (name: string, work: () => unknown) => unknown };
  }) => unknown;
};

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  deliver: vi.fn(),
  reconcile: vi.fn(),
  functions: new Map<string, Worker>(),
}));
vi.mock("@/lib/inngest", () => ({
  inngest: {
    send: mocks.send,
    createFunction: (
      options: {
        id: string;
        triggers: ({ event: string } | { cron: string })[];
      },
      handler: Worker["handler"],
    ) => {
      mocks.functions.set(options.id, { ...options, handler });
      return { ...options, handler };
    },
  },
}));
vi.mock("@/features/notifications/service/delivery", () => ({
  deliverAccountEmails: mocks.deliver,
}));
vi.mock("@/features/billing/service/sync", () => ({
  reconcileBilling: mocks.reconcile,
}));
vi.mock("@/features/sharing/service/delivery", () => ({
  deliverInvitations: vi.fn(),
}));
vi.mock("@/features/media/service/cleanup", () => ({ cleanupMedia: vi.fn() }));

beforeEach(() => mocks.send.mockResolvedValue({ ids: [] }));
afterEach(() => vi.restoreAllMocks());

const run = async (id: string, name: string, data: unknown = {}) =>
  mocks.functions.get(id)!.handler({
    event: { name, data },
    step: { run: (_name, work) => work() },
  });

it("targets the supplied row for events and scans due work only for scheduled recovery", async () => {
  await run("deliver-account-emails", backgroundEvents.accountEmail, {
    id: "email-row",
  });
  expect(mocks.deliver).toHaveBeenLastCalledWith("email-row");
  await run("deliver-account-emails", "inngest/scheduled.timer");
  expect(mocks.deliver).toHaveBeenLastCalledWith(undefined);
  const id = `evt_${"1".repeat(26)}`;
  await run("reconcile-paddle-billing", backgroundEvents.billing, { id });
  expect(mocks.reconcile).toHaveBeenLastCalledWith(id);
  await run("reconcile-paddle-billing", "inngest/scheduled.timer");
  expect(mocks.reconcile).toHaveBeenLastCalledWith(undefined);
});

it("does not turn malformed events into unbounded recovery scans", async () => {
  await expect(
    run("deliver-account-emails", backgroundEvents.accountEmail),
  ).rejects.toThrow();
  await expect(
    run("reconcile-paddle-billing", backgroundEvents.billing, {
      id: "invalid",
    }),
  ).rejects.toThrow();
  expect(mocks.deliver).not.toHaveBeenCalled();
  expect(mocks.reconcile).not.toHaveBeenCalled();
});

it("aligns recovery schedules and keeps nonurgent cleanup less frequent", () => {
  for (const id of [
    "deliver-account-emails",
    "deliver-list-invitations",
    "reconcile-paddle-billing",
  ])
    expect(mocks.functions.get(id)!.triggers).toContainEqual({
      cron: "*/15 * * * *",
    });
  expect(mocks.functions.get("cleanup-media")!.triggers).toEqual([
    { cron: "0 * * * *" },
  ]);
  expect(mocks.functions.get("expire-auth-data")!.triggers).toEqual([
    { cron: "0 3 * * *" },
  ]);
});

it("deduplicates triggers using opaque row IDs and publishes nothing for an empty queue", async () => {
  await publishBackgroundEvents(backgroundEvents.accountEmail, [undefined]);
  expect(mocks.send).not.toHaveBeenCalled();
  await publishBackgroundEvents(backgroundEvents.accountEmail, [
    "row",
    undefined,
    "row",
  ]);
  expect(mocks.send).toHaveBeenCalledExactlyOnceWith([
    {
      name: backgroundEvents.accountEmail,
      id: `${backgroundEvents.accountEmail}/row`,
      data: { id: "row" },
    },
  ]);
});

it("preserves the successful user operation and logs no provider secrets on trigger failure", async () => {
  mocks.send.mockRejectedValueOnce(new Error("private-provider-key"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(
    publishBackgroundEvents(backgroundEvents.billing, ["row"]),
  ).resolves.toBeUndefined();
  expect(log).toHaveBeenCalledOnce();
  expect(JSON.stringify(log.mock.calls)).not.toContain("private-provider-key");
});
