import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { authenticate } from "@/features/auth/service/accounts";
import { deliverInvitations } from "@/features/sharing/service/delivery";
import {
  inviteMember,
  revokeInvitation,
} from "@/features/sharing/service/invitations";
import * as mail from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { assertTestDatabase } from "../e2e/environment";
import { accounts, resetFixtures } from "../e2e/seed";

assertTestDatabase(process.env);
let account: Awaited<ReturnType<typeof authenticate>>;
let id: string;

beforeEach(async () => {
  await resetFixtures();
  account = await authenticate(accounts.member.email, accounts.member.password);
  await prisma.premiumGrant.create({
    data: {
      userId: account.user.id,
      startsAt: new Date(Date.now() - 86400000),
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  ({ id } = await inviteMember(
    account.user.id,
    account.session.id,
    "e2e-private-list",
    { email: accounts.owner.email, role: "MEMBER" },
  ));
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await resetFixtures();
  await prisma.$disconnect();
});

describe("durable invitation delivery", () => {
  it("claims once across concurrent workers and never resends a successful delivery", async () => {
    const send = vi
      .spyOn(mail, "deliverEmail")
      .mockResolvedValue({ error: null });
    const results = await Promise.all([
      deliverInvitations(id),
      deliverInvitations(id),
      deliverInvitations(id),
    ]);
    expect(results.reduce((sum, result) => sum + result.sent, 0)).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][3]).toBe(`wishlist-invitation/${id}`);
    expect(JSON.stringify(send.mock.calls)).not.toContain(
      "Another person's private list",
    );
    expect(JSON.stringify(send.mock.calls)).not.toContain("Private wish");
    await deliverInvitations(id);
    expect(send).toHaveBeenCalledTimes(1);
    expect(await prisma.invitation.findUnique({ where: { id } })).toMatchObject(
      { sentAt: expect.any(Date), deliveryAttempts: 1, claimId: null },
    );
  });

  it("retains failed sends, respects backoff and retries with the same provider key", async () => {
    const send = vi
      .spyOn(mail, "deliverEmail")
      .mockRejectedValueOnce(new Error("provider unavailable"))
      .mockResolvedValue({ error: null });
    expect(await deliverInvitations(id)).toEqual({ sent: 0, failed: 1 });
    expect(await deliverInvitations(id)).toEqual({ sent: 0, failed: 0 });
    await prisma.invitation.update({
      where: { id },
      data: { nextAttemptAt: new Date(0) },
    });
    expect(await deliverInvitations(id)).toEqual({ sent: 1, failed: 0 });
    expect(send.mock.calls[0][3]).toBe(send.mock.calls[1][3]);
    expect(await prisma.invitation.findUnique({ where: { id } })).toMatchObject(
      { sentAt: expect.any(Date), deliveryAttempts: 2 },
    );
  });

  it("recovers an abandoned claim but never retries beyond the provider's idempotency window", async () => {
    const send = vi
      .spyOn(mail, "deliverEmail")
      .mockResolvedValue({ error: null });
    await prisma.invitation.update({
      where: { id },
      data: {
        claimId: "abandoned",
        deliveryAttempts: 1,
        firstAttemptAt: new Date(Date.now() - 180000),
        nextAttemptAt: new Date(0),
      },
    });
    expect(await deliverInvitations(id)).toEqual({ sent: 1, failed: 0 });
    expect(send).toHaveBeenCalledTimes(1);
    await prisma.invitation.update({
      where: { id },
      data: {
        sentAt: null,
        nextAttemptAt: new Date(0),
        firstAttemptAt: new Date(Date.now() - 24 * 3600000),
      },
    });
    expect(await deliverInvitations(id)).toEqual({ sent: 0, failed: 1 });
    expect(send).toHaveBeenCalledTimes(1);
    expect(await prisma.invitation.findUnique({ where: { id } })).toMatchObject(
      { deliveryFailedAt: expect.any(Date) },
    );
  });

  it("stops after bounded failures and leaves a visible failure state", async () => {
    const send = vi
      .spyOn(mail, "deliverEmail")
      .mockRejectedValue(new Error("offline"));
    await prisma.invitation.update({
      where: { id },
      data: { deliveryAttempts: 7 },
    });
    await deliverInvitations(id);
    await prisma.invitation.update({
      where: { id },
      data: { nextAttemptAt: new Date(0) },
    });
    await deliverInvitations(id);
    expect(send).toHaveBeenCalledTimes(1);
    expect(await prisma.invitation.findUnique({ where: { id } })).toMatchObject(
      { deliveryAttempts: 8, deliveryFailedAt: expect.any(Date) },
    );
  });

  it("pauses for expired Premium and never delivers revoked invitations", async () => {
    const send = vi
      .spyOn(mail, "deliverEmail")
      .mockResolvedValue({ error: null });
    await prisma.premiumGrant.updateMany({
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    await deliverInvitations(id);
    expect(send).not.toHaveBeenCalled();
    await prisma.premiumGrant.updateMany({
      data: { expiresAt: new Date(Date.now() + 86400000) },
    });
    await prisma.invitation.update({
      where: { id },
      data: { nextAttemptAt: new Date(0) },
    });
    await revokeInvitation(
      account.user.id,
      account.session.id,
      "e2e-private-list",
      id,
    );
    await deliverInvitations(id);
    expect(send).not.toHaveBeenCalled();
  });
});
