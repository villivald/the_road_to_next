import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import {
  changePublication,
  createList,
  deleteList,
  updateList,
} from "@/features/wishlist/actions/manage-list";
import {
  createWishlist,
  deleteWishlist,
  readManagedWishlist,
  readOwnedWishlists,
  readWishlist,
  setWishlistPublication,
  updateWishlist,
} from "@/features/wishlist/service/lists";
import { prisma } from "@/lib/prisma";
import { assertTestDatabase } from "../e2e/environment";
import { resetFixtures } from "../e2e/seed";

const auth = vi.hoisted(() => ({ userId: "e2e-owner" }));

vi.mock("@/features/auth/queries/get-auth-or-redirect", () => ({
  getAuthOrRedirect: async () => ({ user: { id: auth.userId } }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

const input = {
  title: "Birthday ideas",
  description: "A few things I love.",
  reservationsEnabled: false,
};

assertTestDatabase(process.env);

beforeEach(async () => {
  auth.userId = "e2e-owner";
  await resetFixtures();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("wishlist management and authorization", () => {
  it("creates a public draft and admin membership using session identity, ignoring injected fields", async () => {
    const data = new FormData();
    data.set("title", "  Birthday ideas  ");
    data.set("description", "  A few things I love.  ");
    data.set("ownerId", "e2e-member");
    data.set("visibility", "PRIVATE");
    data.set("publication", "PUBLISHED");

    await expect(createList(EMPTY_ACTION_STATE, data)).rejects.toThrow(
      "REDIRECT:/lists/",
    );

    const list = await prisma.wishlist.findFirstOrThrow({
      where: { title: input.title },
      include: { memberships: true },
    });

    expect(list).toMatchObject({
      ...input,
      ownerId: "e2e-owner",
      publication: "DRAFT",
      visibility: "PUBLIC",
    });
    expect(list.memberships).toMatchObject([
      { userId: "e2e-owner", role: "ADMIN" },
    ]);

    await expect(createWishlist("e2e-owner", input)).resolves.toHaveProperty(
      "id",
    );
  });

  it("rejects invalid fields and unverified actors without persisting a list", async () => {
    for (const invalid of [
      { title: "   " },
      { title: "x".repeat(201) },
      { description: "x".repeat(2001) },
      { reservationsEnabled: "true" },
    ]) {
      await expect(
        createWishlist("e2e-owner", { ...input, ...invalid }),
      ).rejects.toThrow();
    }

    await prisma.user.update({
      where: { id: "e2e-owner" },
      data: { emailVerified: false },
    });
    await expect(createWishlist("e2e-owner", input)).rejects.toThrow(
      "verified account",
    );
    expect(await prisma.wishlist.count({ where: { title: input.title } })).toBe(
      0,
    );
  });

  it("restricts drafts to admins and never returns private content or membership identities to outsiders", async () => {
    const list = await createWishlist("e2e-owner", input);

    expect(await readWishlist(list.id, null)).toBeNull();
    expect(await readWishlist(list.id, "e2e-member")).toBeNull();
    expect(await readWishlist("e2e-private-list", "e2e-owner")).toBeNull();

    await prisma.membership.create({
      data: { wishlistId: list.id, userId: "e2e-member", role: "MEMBER" },
    });
    expect(await readWishlist(list.id, "e2e-member")).toBeNull();

    await setWishlistPublication("e2e-owner", list.id, "PUBLISHED");
    expect(await readWishlist(list.id, null)).toEqual({
      id: list.id,
      image: null,
      ...input,
      publication: "PUBLISHED",
      visibility: "PUBLIC",
      canManage: false,
    });

    await prisma.wishlist.update({
      where: { id: list.id },
      data: { visibility: "PRIVATE" },
    });
    expect(await readWishlist(list.id, null)).toBeNull();
    expect(await readWishlist(list.id, "e2e-member")).toMatchObject({
      canManage: false,
    });

    await setWishlistPublication("e2e-owner", list.id, "DRAFT");
    await prisma.membership.update({
      where: {
        wishlistId_userId: { wishlistId: list.id, userId: "e2e-member" },
      },
      data: { role: "ADMIN" },
    });
    expect(await readWishlist(list.id, "e2e-member")).toMatchObject({
      canManage: true,
    });
  });

  it("rejects direct update, publication, and deletion actions by a non-admin", async () => {
    const list = await createWishlist("e2e-owner", input);
    await setWishlistPublication("e2e-owner", list.id, "PUBLISHED");
    await prisma.membership.create({
      data: { wishlistId: list.id, userId: "e2e-member", role: "MEMBER" },
    });
    auth.userId = "e2e-member";

    const data = new FormData();
    data.set("title", "Hijacked");
    data.set("ownerId", "e2e-owner");
    data.set("publication", "DRAFT");
    data.set("confirm", "delete");

    for (const action of [updateList, changePublication, deleteList]) {
      expect(await action(list.id, EMPTY_ACTION_STATE, data)).toMatchObject({
        status: "ERROR",
        message: expect.stringContaining("unavailable"),
      });
    }

    expect(await readManagedWishlist(list.id, "e2e-member")).toBeNull();
    expect(
      await prisma.wishlist.findUnique({ where: { id: list.id } }),
    ).toMatchObject({
      title: input.title,
      ownerId: "e2e-owner",
      publication: "PUBLISHED",
    });
  });

  it("permits another admin to edit but strips ownership and visibility changes", async () => {
    const list = await createWishlist("e2e-owner", input);
    await prisma.membership.create({
      data: { wishlistId: list.id, userId: "e2e-member", role: "ADMIN" },
    });

    await updateWishlist("e2e-member", list.id, {
      ...input,
      title: "Updated",
      description: "  ",
      ownerId: "e2e-member",
      visibility: "PRIVATE",
      publication: "PUBLISHED",
    });

    expect(await readManagedWishlist(list.id, "e2e-member")).toMatchObject({
      title: "Updated",
      description: null,
      visibility: "PUBLIC",
      publication: "DRAFT",
    });
    expect(
      (await prisma.wishlist.findUniqueOrThrow({ where: { id: list.id } }))
        .ownerId,
    ).toBe("e2e-owner");
  });

  it("rechecks revoked admin access, verification, archived and missing lists", async () => {
    const list = await createWishlist("e2e-owner", input);
    await prisma.membership.create({
      data: { wishlistId: list.id, userId: "e2e-member", role: "ADMIN" },
    });
    await prisma.membership.delete({
      where: {
        wishlistId_userId: { wishlistId: list.id, userId: "e2e-member" },
      },
    });

    await expect(updateWishlist("e2e-member", list.id, input)).rejects.toThrow(
      "unavailable",
    );
    await prisma.user.update({
      where: { id: "e2e-owner" },
      data: { emailVerified: false },
    });
    await expect(updateWishlist("e2e-owner", list.id, input)).rejects.toThrow(
      "unavailable",
    );

    for (const id of ["e2e-archived-list", "e2e-missing-list"]) {
      expect(await readWishlist(id, "e2e-owner")).toBeNull();
      await expect(
        setWishlistPublication("e2e-owner", id, "PUBLISHED"),
      ).rejects.toThrow("unavailable");
      await expect(deleteWishlist("e2e-owner", id)).rejects.toThrow(
        "unavailable",
      );
    }
  });

  it("preserves reservations when disabled, ends them on unpublish, and never restores them", async () => {
    const list = await createWishlist("e2e-owner", {
      ...input,
      reservationsEnabled: true,
    });
    await setWishlistPublication("e2e-owner", list.id, "PUBLISHED");
    const wish = await prisma.wish.create({
      data: {
        wishlistId: list.id,
        title: "A book",
        reservations: { create: { userId: "e2e-member" } },
      },
    });

    await updateWishlist("e2e-owner", list.id, input);
    expect(
      await prisma.reservation.count({
        where: { wishId: wish.id, endedAt: null },
      }),
    ).toBe(1);

    await Promise.all([
      setWishlistPublication("e2e-owner", list.id, "DRAFT"),
      updateWishlist("e2e-owner", list.id, {
        ...input,
        title: "Edited concurrently",
      }),
    ]);

    expect(await readWishlist(list.id, null)).toBeNull();
    expect(
      await prisma.reservation.count({
        where: { wishId: wish.id, endedAt: null },
      }),
    ).toBe(0);

    await setWishlistPublication("e2e-owner", list.id, "PUBLISHED");
    expect(
      await prisma.reservation.count({
        where: { wishId: wish.id, endedAt: null },
      }),
    ).toBe(0);
  });

  it("requires deletion confirmation and cascades content without deleting either user", async () => {
    const result = await deleteList(
      "e2e-private-list",
      EMPTY_ACTION_STATE,
      new FormData(),
    );
    expect(result.status).toBe("ERROR");

    await prisma.reservation.create({
      data: { wishId: "e2e-wish", userId: "e2e-owner" },
    });
    await deleteWishlist("e2e-member", "e2e-private-list");

    expect(await readWishlist("e2e-private-list", "e2e-member")).toBeNull();
    expect(
      await prisma.wish.count({ where: { wishlistId: "e2e-private-list" } }),
    ).toBe(0);
    expect(
      await prisma.membership.count({
        where: { wishlistId: "e2e-private-list" },
      }),
    ).toBe(0);
    expect(
      await prisma.reservation.count({ where: { wishId: "e2e-wish" } }),
    ).toBe(0);
    expect(
      await prisma.user.count({
        where: { id: { in: ["e2e-owner", "e2e-member"] } },
      }),
    ).toBe(2);
  });

  it("paginates owned active lists without leaking other owners or archives", async () => {
    for (let index = 0; index < 21; index++) {
      await createWishlist("e2e-owner", { ...input, title: `List ${index}` });
    }

    const first = await readOwnedWishlists("e2e-owner");
    const second = await readOwnedWishlists("e2e-owner", 2);

    expect(first.lists).toHaveLength(20);
    expect(first.hasNextPage).toBe(true);
    expect(second.lists).toHaveLength(1);
    expect(second.hasNextPage).toBe(false);
    expect(
      new Set([...first.lists, ...second.lists].map((list) => list.id)).size,
    ).toBe(21);
    expect((await readOwnedWishlists("e2e-owner", Number.NaN)).page).toBe(1);
  });
});
