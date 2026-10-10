import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import { readableImage } from "@/features/media/service/media";
import {
  cancel,
  reserve,
  revoke,
} from "@/features/reservation/actions/manage-reservation";
import {
  cancelReservation,
  readMyReservations,
  reserveWish,
  revokeReservation,
} from "@/features/reservation/service/reservations";
import {
  createWish,
  deleteWish,
  readListWishes,
  readWish,
  transitionWish,
} from "@/features/wish/service/wishes";
import {
  createWishlist,
  deleteWishlist,
  setWishlistPublication,
  updateWishlist,
} from "@/features/wishlist/service/lists";
import { prisma } from "@/lib/prisma";
import { assertTestDatabase } from "../e2e/environment";
import { resetFixtures } from "../e2e/seed";

const auth = vi.hoisted(() => ({ userId: "e2e-member" }));
vi.mock("@/features/auth/queries/get-auth-or-redirect", () => ({
  getAuthOrRedirect: async () => ({ user: { id: auth.userId } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

let listId: string;
let wishId: string;
const active = () =>
  prisma.reservation.findMany({ where: { wishId, endedAt: null } });
const reservationId = async () => (await active())[0].id;
const member = () =>
  prisma.membership.create({
    data: { wishlistId: listId, userId: "e2e-member" },
  });
const makePrivate = () =>
  prisma.wishlist.update({
    where: { id: listId },
    data: { visibility: "PRIVATE" },
  });
const removeMember = () =>
  prisma.membership.delete({
    where: { wishlistId_userId: { wishlistId: listId, userId: "e2e-member" } },
  });

assertTestDatabase(process.env);

beforeEach(async () => {
  await resetFixtures();
  auth.userId = "e2e-member";
  ({ id: listId } = await createWishlist("e2e-owner", {
    title: "Gift ideas",
    description: "",
    reservationsEnabled: true,
  }));
  await setWishlistPublication("e2e-owner", listId, "PUBLISHED");
  ({ id: wishId } = await createWish("e2e-owner", listId, {
    title: "A beautiful notebook",
  }));
});

afterAll(() => prisma.$disconnect());

describe("reservations", () => {
  it("allows verified public non-members and owner self-reservations", async () => {
    await reserveWish("e2e-member", listId, wishId);
    const id = await reservationId();
    expect(await readMyReservations("e2e-member")).toMatchObject({
      reservations: [{ id, wish: { id: wishId } }],
    });
    await cancelReservation("e2e-member", listId, wishId, id);
    await reserveWish("e2e-owner", listId, wishId);
    expect(await readWish(listId, wishId, "e2e-owner")).toMatchObject({
      isReservedByYou: true,
      canReserve: false,
    });
  });

  it("gives exactly one winner in simultaneous requests and keeps the database uniqueness safeguard", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, (_, index) =>
        reserveWish(index % 2 ? "e2e-member" : "e2e-owner", listId, wishId),
      ),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(await active()).toHaveLength(1);
    await expect(
      prisma.reservation.create({ data: { wishId, userId: "e2e-member" } }),
    ).rejects.toThrow();
  });

  it.each([
    "draft",
    "disabled",
    "hidden",
    "fulfilled",
    "private",
    "archived",
    "unverified",
    "wrong-parent",
    "missing",
  ])("rejects an ineligible reservation: %s", async (state) => {
    if (state === "draft") {
      await setWishlistPublication("e2e-owner", listId, "DRAFT");
    }
    if (state === "disabled") {
      await updateWishlist("e2e-owner", listId, {
        title: "Gift ideas",
        description: "",
        reservationsEnabled: false,
      });
    }
    if (state === "hidden") {
      await transitionWish("e2e-owner", listId, wishId, "hide");
    }
    if (state === "fulfilled") {
      await transitionWish("e2e-owner", listId, wishId, "fulfill");
    }
    if (state === "private") {
      await makePrivate();
    }
    if (state === "archived") {
      await prisma.wishlist.update({
        where: { id: listId },
        data: { archivedAt: new Date() },
      });
    }
    if (state === "unverified") {
      await prisma.user.update({
        where: { id: "e2e-member" },
        data: { emailVerified: false },
      });
    }
    await expect(
      reserveWish(
        "e2e-member",
        state === "wrong-parent" ? "e2e-private-list" : listId,
        state === "missing" ? "missing" : wishId,
      ),
    ).rejects.toThrow();
    expect(await active()).toHaveLength(0);
  });

  it("uses session identity and rejects tampered cancel/revoke requests without exposing identities", async () => {
    const data = new FormData();
    data.set("userId", "e2e-owner");
    expect(
      (await reserve(listId, wishId, EMPTY_ACTION_STATE, data)).status,
    ).toBe("SUCCESS");
    expect(await active()).toMatchObject([{ userId: "e2e-member" }]);
    const id = await reservationId();
    auth.userId = "e2e-owner";
    expect(
      (await cancel(listId, wishId, id, EMPTY_ACTION_STATE, data)).status,
    ).toBe("ERROR");
    auth.userId = "e2e-member";
    expect(
      (await revoke(listId, wishId, id, EMPTY_ACTION_STATE, data)).status,
    ).toBe("ERROR");
    expect(
      (await cancel("e2e-private-list", wishId, id, EMPTY_ACTION_STATE, data))
        .status,
    ).toBe("ERROR");
    expect(
      (await cancel(listId, "e2e-wish", id, EMPTY_ACTION_STATE, data)).status,
    ).toBe("ERROR");
    expect(await active()).toHaveLength(1);
    await expect(
      cancel(listId, wishId, id, EMPTY_ACTION_STATE, data),
    ).rejects.toThrow("REDIRECT:/en/reservations?canceled=1");
  });

  it("protects content, direct links and media, revealing only status to admins", async () => {
    const image = await prisma.media.create({
      data: {
        pathname: `reservation-test-${wishId}`,
        provider: "LOCAL",
        state: "READY",
        width: 1,
        height: 1,
        bytes: 1,
        alt: "Notebook",
        wishId,
        cleanupAfter: new Date(Date.now() + 86400000),
      },
    });
    await reserveWish("e2e-member", listId, wishId);
    expect((await readListWishes(listId, null)).wishes).toEqual([]);
    expect((await readListWishes(listId, "e2e-member")).wishes).toEqual([]);
    expect(await readWish(listId, wishId, null)).toBeNull();
    expect(await readableImage(image.id, null)).toBeNull();
    expect(await readableImage(image.id, "e2e-member")).not.toBeNull();
    const ownerView = await readWish(listId, wishId, "e2e-owner");
    expect(ownerView).toMatchObject({
      isReserved: true,
      isReservedByYou: false,
    });
    for (const privateValue of [
      "e2e-member",
      "member@example.test",
      "userId",
      'reservations"',
    ]) {
      expect(JSON.stringify(ownerView)).not.toContain(privateValue);
    }
    expect((await readMyReservations("e2e-owner")).reservations).toEqual([]);
    expect(
      JSON.stringify(await readMyReservations("e2e-member")),
    ).not.toContain("userId");
    await prisma.media.delete({ where: { id: image.id } });
  });

  it("keeps existing reservations when disabled and blocks new ones", async () => {
    await reserveWish("e2e-member", listId, wishId);
    await updateWishlist("e2e-owner", listId, {
      title: "Gift ideas",
      description: "",
      reservationsEnabled: false,
    });
    expect(await active()).toHaveLength(1);
    expect((await readMyReservations("e2e-member")).reservations).toHaveLength(
      1,
    );
    expect(await readWish(listId, wishId, "e2e-member")).not.toBeNull();
    const other = await createWish("e2e-owner", listId, { title: "Another" });
    await expect(reserveWish("e2e-member", listId, other.id)).rejects.toThrow();
    await cancelReservation(
      "e2e-member",
      listId,
      wishId,
      await reservationId(),
    );
    expect(await active()).toHaveLength(0);
  });

  it("ends only reservations that lose access when a list becomes private", async () => {
    await reserveWish("e2e-member", listId, wishId);
    const ownWish = await createWish("e2e-owner", listId, {
      title: "Owner's gift",
    });
    await reserveWish("e2e-owner", listId, ownWish.id);
    await makePrivate();
    expect(await active()).toHaveLength(0);
    expect((await readMyReservations("e2e-member")).reservations).toEqual([]);
    expect((await readMyReservations("e2e-owner")).reservations).toHaveLength(
      1,
    );
    await member();
    await reserveWish("e2e-member", listId, wishId);
    expect(await active()).toHaveLength(1);
    await removeMember();
    expect(await active()).toHaveLength(0);
    await member();
    expect(await active()).toHaveLength(0);
  });

  it("preserves a member reservation during privacy changes and public membership removal", async () => {
    await member();
    await reserveWish("e2e-member", listId, wishId);
    const id = await reservationId();
    await makePrivate();
    expect(await active()).toMatchObject([{ id }]);
    await prisma.wishlist.update({
      where: { id: listId },
      data: { visibility: "PUBLIC" },
    });
    await removeMember();
    expect(await active()).toMatchObject([{ id }]);
    expect((await readMyReservations("e2e-member")).reservations).toHaveLength(
      1,
    );
  });

  it.each([
    "hide",
    "fulfill",
    "unpublish",
    "archive",
    "delete-wish",
    "delete-list",
    "delete-reserver",
  ])("ends reservations on %s without restoring them", async (change) => {
    await reserveWish("e2e-member", listId, wishId);
    if (change === "hide" || change === "fulfill") {
      await transitionWish("e2e-owner", listId, wishId, change);
      await transitionWish(
        "e2e-owner",
        listId,
        wishId,
        change === "hide" ? "unhide" : "reopen",
      );
    }
    if (change === "unpublish") {
      await setWishlistPublication("e2e-owner", listId, "DRAFT");
      await setWishlistPublication("e2e-owner", listId, "PUBLISHED");
    }
    if (change === "archive") {
      await prisma.wishlist.update({
        where: { id: listId },
        data: { archivedAt: new Date() },
      });
    }
    if (change === "delete-wish") {
      await deleteWish("e2e-owner", listId, wishId);
    }
    if (change === "delete-list") {
      await deleteWishlist("e2e-owner", listId);
    }
    if (change === "delete-reserver") {
      await prisma.wishlist.delete({ where: { id: "e2e-private-list" } });
      await prisma.user.delete({ where: { id: "e2e-member" } });
    }
    expect(await active()).toHaveLength(0);
    expect((await readMyReservations("e2e-member")).reservations).toEqual([]);
  });

  it.each([
    "hide",
    "unpublish",
    "private",
    "remove-member",
    "archive",
    "delete-wish",
  ])("serializes reservation creation with %s", async (change) => {
    if (change === "remove-member") {
      await member();
      await makePrivate();
    }
    const mutate = () => {
      switch (change) {
        case "hide":
          return transitionWish("e2e-owner", listId, wishId, "hide");
        case "unpublish":
          return setWishlistPublication("e2e-owner", listId, "DRAFT");
        case "private":
          return makePrivate();
        case "remove-member":
          return removeMember();
        case "archive":
          return prisma.wishlist.update({
            where: { id: listId },
            data: { archivedAt: new Date() },
          });
        default:
          return deleteWish("e2e-owner", listId, wishId);
      }
    };
    const results = await Promise.allSettled([
      reserveWish("e2e-member", listId, wishId),
      mutate(),
    ]);
    expect(results[1].status).toBe("fulfilled");
    expect(await active()).toHaveLength(0);
  });

  it("allows admins to revoke, denies revoked admins and protects newer reservations from stale requests", async () => {
    await reserveWish("e2e-member", listId, wishId);
    const first = await reservationId();
    await revokeReservation("e2e-owner", listId, wishId, first);
    await reserveWish("e2e-member", listId, wishId);
    const second = await reservationId();
    await cancelReservation("e2e-member", listId, wishId, first);
    await expect(
      revokeReservation("e2e-owner", listId, wishId, first),
    ).rejects.toThrow();
    expect(await active()).toMatchObject([{ id: second }]);
    await cancelReservation("e2e-member", listId, wishId, second);
    await reserveWish("e2e-owner", listId, wishId);
    const membership = await prisma.membership.create({
      data: { wishlistId: listId, userId: "e2e-member", role: "ADMIN" },
    });
    await revokeReservation(
      "e2e-member",
      listId,
      wishId,
      await reservationId(),
    );
    await reserveWish("e2e-owner", listId, wishId);
    await prisma.membership.update({
      where: { id: membership.id },
      data: { role: "MEMBER" },
    });
    await expect(
      revokeReservation("e2e-member", listId, wishId, await reservationId()),
    ).rejects.toThrow();
    expect(await active()).toHaveLength(1);
  });

  it("paginates only active, accessible reservations and applies shared limits", async () => {
    for (let index = 0; index < 22; index++) {
      const wish = await createWish("e2e-owner", listId, {
        title: `Gift ${index}`,
      });
      await reserveWish("e2e-member", listId, wish.id);
    }
    const first = await readMyReservations("e2e-member");
    const second = await readMyReservations("e2e-member", 2);
    expect(first.reservations).toHaveLength(20);
    expect(first.hasNextPage).toBe(true);
    expect(second.reservations).toHaveLength(2);
    expect(second.hasNextPage).toBe(false);
    expect(
      new Set(
        [...first.reservations, ...second.reservations].map(({ id }) => id),
      ).size,
    ).toBe(22);
    expect((await readMyReservations("e2e-member", NaN)).page).toBe(1);
    await prisma.authRateLimit.updateMany({ data: { attempts: 60 } });
    expect(
      await reserve(listId, wishId, EMPTY_ACTION_STATE, new FormData()),
    ).toMatchObject({
      status: "ERROR",
      message: expect.stringContaining("Too many attempts"),
    });
    await makePrivate();
    expect((await readMyReservations("e2e-member")).reservations).toEqual([]);
  });
});
