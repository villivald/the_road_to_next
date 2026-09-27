import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";

const mocks = vi.hoisted(() => {
  const tx = {
    organization: { create: vi.fn() },
    membership: { updateMany: vi.fn() },
  };
  return {
    tx,
    prisma: {
      ticket: { findUnique: vi.fn(), upsert: vi.fn() },
      comment: { findUnique: vi.fn(), update: vi.fn() },
      $transaction: vi.fn(),
      membership: { updateMany: vi.fn() },
    },
    auth: vi.fn(),
    revalidate: vi.fn(),
    cookie: vi.fn(),
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/features/auth/queries/get-auth-or-redirect", () => ({
  getAuthOrRedirect: mocks.auth,
}));
vi.mock("@/actions/cookies", () => ({ setCookieByKey: mocks.cookie }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
import { updateComment } from "@/features/comment/actions/update-comment";
import { createOrganization } from "@/features/organization/actions/create-organization";
import { upsertTicket } from "@/features/ticket/actions/upsert-ticket";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
};
beforeEach(() => {
  mocks.auth.mockResolvedValue({
    user: { id: "owner" },
    activeOrganization: { id: "organization" },
  });
  mocks.prisma.$transaction.mockImplementation(async (callback) =>
    callback(mocks.tx),
  );
});

describe("ticket mutations", () => {
  const fields = {
    title: "Ticket",
    content: "Description",
    deadline: "2027-02-15",
    bounty: "19.99",
  };
  it("rejects a forged ticket ID owned by another user", async () => {
    mocks.prisma.ticket.findUnique.mockResolvedValue({
      userId: "someone-else",
    });
    const state = await upsertTicket(
      EMPTY_ACTION_STATE,
      form({ ...fields, ticketId: "foreign-ticket" }),
    );
    expect(state.status).toBe("ERROR");
    expect(mocks.prisma.ticket.upsert).not.toHaveBeenCalled();
  });
  it("rejects invalid dates and oversized bounties before writing", async () => {
    for (const invalid of [
      { deadline: "2027-02-31" },
      { bounty: "21474836.48" },
    ]) {
      const state = await upsertTicket(
        EMPTY_ACTION_STATE,
        form({ ...fields, ...invalid }),
      );
      expect(state.status).toBe("ERROR");
    }
    expect(mocks.prisma.ticket.upsert).not.toHaveBeenCalled();
  });
  it("creates a ticket in the authenticated user's active organization", async () => {
    const state = await upsertTicket(EMPTY_ACTION_STATE, form(fields));
    expect(state.status).toBe("SUCCESS");
    expect(mocks.prisma.ticket.upsert.mock.calls[0][0].create).toMatchObject({
      userId: "owner",
      organizationId: "organization",
      bounty: 1999,
    });
  });
});

describe("organization and comment regressions", () => {
  it("updates active memberships using the same transaction as organization creation", async () => {
    mocks.tx.organization.create.mockResolvedValue({ id: "new-organization" });
    await expect(
      createOrganization(
        EMPTY_ACTION_STATE,
        form({ name: "New organization" }),
      ),
    ).rejects.toThrow("redirect:/tickets");
    expect(mocks.tx.membership.updateMany).toHaveBeenCalledOnce();
    expect(mocks.prisma.membership.updateMany).not.toHaveBeenCalled();
  });
  it("revalidates the parent ticket when a comment changes", async () => {
    mocks.prisma.comment.findUnique.mockResolvedValue({
      userId: "owner",
      ticketId: "parent-ticket",
    });
    const state = await updateComment(
      EMPTY_ACTION_STATE,
      form({ content: "Updated", commentId: "comment-id" }),
    );
    expect(state.status).toBe("SUCCESS");
    expect(mocks.revalidate).toHaveBeenCalledWith("/tickets/parent-ticket");
  });
  it("rejects changes to another user's comment", async () => {
    mocks.prisma.comment.findUnique.mockResolvedValue({
      userId: "someone-else",
      ticketId: "parent-ticket",
    });
    const state = await updateComment(
      EMPTY_ACTION_STATE,
      form({ content: "Updated", commentId: "comment-id" }),
    );
    expect(state.status).toBe("ERROR");
    expect(mocks.prisma.comment.update).not.toHaveBeenCalled();
  });
});
