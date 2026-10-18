import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import {
  discoverLists,
  discoverUsers,
} from "@/features/discovery/service/discovery";
import { changeFavorite } from "@/features/favorites/actions/manage-favorites";
import {
  readFavoriteIds,
  readFavorites,
  setFavorite,
} from "@/features/favorites/service/favorites";
import {
  cancelReservation,
  readMyReservations,
  reserveWish,
} from "@/features/reservation/service/reservations";
import { transitionWish } from "@/features/wish/service/wishes";
import { setWishlistPublication } from "@/features/wishlist/service/lists";
import { prisma } from "@/lib/prisma";
import { assertTestDatabase } from "../e2e/environment";
import { resetFixtures } from "../e2e/seed";

const actor = vi.hoisted(() => ({ id: "e2e-member" }));
vi.mock("@/features/auth/queries/get-auth-or-redirect", () => ({
  getAuthOrRedirect: async () => ({ user: { id: actor.id } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

assertTestDatabase(process.env);
const listId = "e2e-favorites-list";
const wishId = "e2e-favorites-wish";
const save = (
  kind: "list" | "wish" | "person",
  targetId: string,
  saved = true,
  userId = "e2e-member",
) => setFavorite(userId, { kind, targetId, saved });

beforeEach(async () => {
  await resetFixtures();
  actor.id = "e2e-member";
  await prisma.wishlist.create({
    data: {
      id: listId,
      title: "Saved gift ideas",
      publication: "PUBLISHED",
      ownerId: "e2e-owner",
      reservationsEnabled: true,
      memberships: { create: { userId: "e2e-owner", role: "ADMIN" } },
      wishes: {
        create: {
          id: wishId,
          title: "Saved notebook",
          authorId: "e2e-owner",
          priority: 4,
          externalUrl: "https://example.com/notebook",
        },
      },
    },
  });
});
afterAll(() => prisma.$disconnect());

describe("private favorites", () => {
  it("saves all three types without changing public discovery or exposing private fields", async () => {
    const lists = await discoverLists({});
    const people = await discoverUsers({});
    await save("list", listId);
    await save("wish", wishId);
    await save("person", "e2e-owner");
    expect((await readFavorites("e2e-member")).lists).toMatchObject([
      { id: listId },
    ]);
    expect(
      (await readFavorites("e2e-member", { view: "wishes" })).wishes,
    ).toMatchObject([{ id: wishId }]);
    const users = await readFavorites("e2e-member", { view: "people" });
    expect(users.people).toMatchObject([
      { username: "e2e-owner", publicListCount: 1 },
    ]);
    for (const value of [
      "passwordHash",
      "owner@example.test",
      "userId",
      "personId",
    ])
      expect(JSON.stringify(users)).not.toContain(value);
    expect(await discoverLists({})).toEqual(lists);
    expect(await discoverUsers({})).toEqual(people);
    expect((await readFavorites("e2e-owner")).lists).toEqual([]);
    expect(await readFavoriteIds(null, "list", [listId])).toEqual([]);
  });

  it("uses idempotent explicit states and unique constraints under concurrent saves", async () => {
    await Promise.all(Array.from({ length: 8 }, () => save("wish", wishId)));
    expect(await prisma.favoriteWish.count()).toBe(1);
    const first = await prisma.favoriteWish.findFirstOrThrow();
    await save("wish", wishId);
    expect((await prisma.favoriteWish.findFirstOrThrow()).createdAt).toEqual(
      first.createdAt,
    );
    await save("wish", wishId, true, "e2e-owner");
    await save("wish", wishId, false);
    await save("wish", wishId, false);
    expect(await readFavoriteIds("e2e-member", "wish", [wishId])).toEqual([]);
    expect(await readFavoriteIds("e2e-owner", "wish", [wishId])).toEqual([
      wishId,
    ]);
    await expect(
      prisma.favoriteWish.create({ data: { wishId, userId: "e2e-owner" } }),
    ).rejects.toThrow();
  });

  it.each(["private", "draft", "archived"])(
    "hides saved content and people after a list becomes %s, without granting permanent access",
    async (change) => {
      await save("list", listId);
      await save("wish", wishId);
      await save("person", "e2e-owner");
      if (change === "private")
        await prisma.wishlist.update({
          where: { id: listId },
          data: { visibility: "PRIVATE" },
        });
      if (change === "draft")
        await setWishlistPublication("e2e-owner", listId, "DRAFT");
      if (change === "archived")
        await prisma.wishlist.update({
          where: { id: listId },
          data: { archivedAt: new Date() },
        });
      expect((await readFavorites("e2e-member")).lists).toEqual([]);
      expect(
        (await readFavorites("e2e-member", { view: "wishes" })).wishes,
      ).toEqual([]);
      expect(
        (await readFavorites("e2e-member", { view: "people" })).people,
      ).toEqual([]);
      await expect(save("list", listId)).rejects.toThrow("unavailable");
      await expect(save("wish", wishId)).rejects.toThrow("unavailable");
      await expect(save("person", "e2e-owner")).rejects.toThrow("unavailable");
      await save("wish", wishId, false);
      expect(await prisma.favoriteWish.count()).toBe(0);
      await prisma.wishlist.update({
        where: { id: listId },
        data: {
          visibility: "PUBLIC",
          publication: "PUBLISHED",
          archivedAt: null,
        },
      });
      expect((await readFavorites("e2e-member")).lists).toHaveLength(1);
      expect(
        (await readFavorites("e2e-member", { view: "wishes" })).wishes,
      ).toEqual([]);
    },
  );

  it.each(["hide", "fulfill"])(
    "rechecks %s transitions while preserving the admin's existing management access",
    async (transition) => {
      await save("wish", wishId);
      await save("wish", wishId, true, "e2e-owner");
      await transitionWish(
        "e2e-owner",
        listId,
        wishId,
        transition as "hide" | "fulfill",
      );
      expect(
        (await readFavorites("e2e-member", { view: "wishes" })).wishes,
      ).toEqual([]);
      await expect(save("wish", wishId)).rejects.toThrow("unavailable");
      expect(
        (await readFavorites("e2e-owner", { view: "wishes" })).wishes,
      ).toHaveLength(1);
      await transitionWish(
        "e2e-owner",
        listId,
        wishId,
        transition === "hide" ? "unhide" : "reopen",
      );
      expect(
        (await readFavorites("e2e-member", { view: "wishes" })).wishes,
      ).toHaveLength(1);
    },
  );

  it("keeps a reserved wish visible only to its reserver or admins, never disclosing reserver identities", async () => {
    await save("wish", wishId);
    await save("wish", wishId, true, "e2e-owner");
    await reserveWish("e2e-owner", listId, wishId);
    expect(
      (await readFavorites("e2e-member", { view: "wishes" })).wishes,
    ).toEqual([]);
    await expect(save("wish", wishId)).rejects.toThrow("unavailable");
    const reservation = await prisma.reservation.findFirstOrThrow({
      where: { wishId, endedAt: null },
    });
    await cancelReservation("e2e-owner", listId, wishId, reservation.id);
    await reserveWish("e2e-member", listId, wishId);
    expect(
      (await readFavorites("e2e-member", { view: "wishes" })).wishes,
    ).toMatchObject([
      {
        id: wishId,
        isReserved: true,
        isReservedByYou: true,
        canReserve: false,
        priority: 4,
      },
    ]);
    const ownerView = JSON.stringify(
      await readFavorites("e2e-owner", { view: "wishes" }),
    );
    expect(ownerView).not.toContain("e2e-member");
    expect(ownerView).not.toContain('"reservations":');
    expect(ownerView).not.toContain('"userId":');
    expect((await readMyReservations("e2e-member")).reservations).toMatchObject(
      [{ wish: { id: wishId, priority: 4 } }],
    );
    const ownReservation = await prisma.reservation.findFirstOrThrow({
      where: { wishId, endedAt: null },
    });
    await cancelReservation("e2e-member", listId, wishId, ownReservation.id);
    expect(
      (await readFavorites("e2e-member", { view: "wishes" })).wishes,
    ).toMatchObject([
      {
        id: wishId,
        isReserved: false,
        isReservedByYou: false,
        canReserve: true,
      },
    ]);
    expect(
      await prisma.favoriteWish.count({
        where: { userId: "e2e-member", wishId },
      }),
    ).toBe(1);
    expect((await readMyReservations("e2e-member")).reservations).toEqual([]);
  });

  it("retains private-list bookmarks only while independent membership permits viewing", async () => {
    await prisma.wishlist.update({
      where: { id: listId },
      data: { visibility: "PRIVATE" },
    });
    await expect(save("list", listId)).rejects.toThrow("unavailable");
    await prisma.membership.create({
      data: { wishlistId: listId, userId: "e2e-member" },
    });
    await save("list", listId);
    await save("wish", wishId);
    expect((await readFavorites("e2e-member")).lists).toHaveLength(1);
    await prisma.membership.delete({
      where: {
        wishlistId_userId: { wishlistId: listId, userId: "e2e-member" },
      },
    });
    expect((await readFavorites("e2e-member")).lists).toEqual([]);
    expect(
      (await readFavorites("e2e-member", { view: "wishes" })).wishes,
    ).toEqual([]);
  });

  it("uses session identity for actions and rejects invalid targets or unverified accounts", async () => {
    const data = new FormData();
    data.set("saved", "true");
    data.set("userId", "e2e-owner");
    expect(
      (await changeFavorite("list", listId, EMPTY_ACTION_STATE, data)).status,
    ).toBe("SUCCESS");
    expect(await prisma.favoriteList.findFirst()).toMatchObject({
      userId: "e2e-member",
    });
    for (const id of ["missing", "e2e-archived-list"])
      expect(
        (await changeFavorite("list", id, EMPTY_ACTION_STATE, data)).status,
      ).toBe("ERROR");
    await prisma.wishlist.update({
      where: { id: listId },
      data: { visibility: "PRIVATE" },
    });
    expect(
      (await changeFavorite("list", listId, EMPTY_ACTION_STATE, data)).status,
    ).toBe("ERROR");
    data.set("saved", "toggle");
    expect(
      (await changeFavorite("list", listId, EMPTY_ACTION_STATE, data)).status,
    ).toBe("ERROR");
    await prisma.user.update({
      where: { id: "e2e-member" },
      data: { emailVerified: false },
    });
    await expect(save("list", listId)).rejects.toThrow("Verify your email");
    expect((await readFavorites("e2e-member")).lists).toEqual([]);
    expect(await readFavoriteIds("e2e-member", "list", [listId])).toEqual([]);
  });

  it("reads current content and cascades bookmark removal when targets or the saving account are deleted", async () => {
    await save("list", listId);
    await save("wish", wishId);
    await save("person", "e2e-owner");
    await prisma.wish.update({
      where: { id: wishId },
      data: { title: "Updated notebook" },
    });
    expect(
      (await readFavorites("e2e-member", { view: "wishes" })).wishes?.[0].title,
    ).toBe("Updated notebook");
    await prisma.wishlist.delete({ where: { id: listId } });
    expect(await prisma.favoriteList.count()).toBe(0);
    expect(await prisma.favoriteWish.count()).toBe(0);
    await prisma.wishlist.deleteMany({ where: { ownerId: "e2e-owner" } });
    await prisma.user.delete({ where: { id: "e2e-owner" } });
    expect(await prisma.favoritePerson.count()).toBe(0);
    await prisma.user.create({
      data: {
        id: "e2e-bookmarker",
        username: "e2e-bookmarker",
        email: "bookmark@example.test",
        emailVerified: true,
        passwordHash: "unused-fixture-hash",
      },
    });
    await prisma.wishlist.update({
      where: { id: "e2e-private-list" },
      data: { publication: "PUBLISHED", visibility: "PUBLIC" },
    });
    await save("list", "e2e-private-list", true, "e2e-bookmarker");
    await prisma.user.delete({ where: { id: "e2e-bookmarker" } });
    expect(await prisma.favoriteList.count()).toBe(0);
  });

  it("paginates visible favorites in saved order without counting inaccessible items", async () => {
    await prisma.wish.createMany({
      data: Array.from({ length: 22 }, (_, index) => ({
        id: `e2e-fav-page-${index}`,
        wishlistId: listId,
        title: `Pick ${index}`,
      })),
    });
    await prisma.favoriteWish.createMany({
      data: Array.from({ length: 22 }, (_, index) => ({
        userId: "e2e-member",
        wishId: `e2e-fav-page-${index}`,
        createdAt: new Date(2026, 0, index + 1),
      })),
    });
    await prisma.wish.update({
      where: { id: "e2e-fav-page-21" },
      data: { hidden: true },
    });
    const first = await readFavorites("e2e-member", { view: "wishes" });
    const second = await readFavorites("e2e-member", {
      view: "wishes",
      page: "2",
    });
    expect(first.wishes).toHaveLength(20);
    expect(first.hasNextPage).toBe(true);
    expect(first.wishes?.[0].id).toBe("e2e-fav-page-20");
    expect(second.wishes).toHaveLength(1);
    expect(second.hasNextPage).toBe(false);
    expect(
      (await readFavorites("e2e-member", { view: "wishes", page: "-1" })).page,
    ).toBe(1);
  });
});
