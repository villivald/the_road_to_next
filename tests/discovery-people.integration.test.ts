import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  discoverLists,
  discoverUsers,
  discoverWishes,
} from "@/features/discovery/service/discovery";
import { readableImage } from "@/features/media/service/media";
import { readOwnedWishlists } from "@/features/wishlist/service/lists";
import { prisma } from "@/lib/prisma";
import { assertTestDatabase } from "../e2e/environment";
import { resetFixtures } from "../e2e/seed";

assertTestDatabase(process.env);
const listId = "e2e-people-list";
beforeEach(async () => {
  await resetFixtures();
  await prisma.media.deleteMany({
    where: { pathname: { startsWith: "e2e-people/" } },
  });
  await prisma.user.update({
    where: { id: "e2e-owner" },
    data: { name: "Ada 100% Müller", description: "Public biography marker" },
  });
  await prisma.wishlist.create({
    data: {
      id: listId,
      title: "Public ideas",
      publication: "PUBLISHED",
      ownerId: "e2e-owner",
      memberships: { create: { userId: "e2e-owner", role: "ADMIN" } },
    },
  });
});
afterAll(() => prisma.$disconnect());

const mediaData = (name: string) => ({
  pathname: `e2e-people/${name}`,
  provider: "LOCAL" as const,
  state: "READY" as const,
  alt: name,
  width: 100,
  height: 100,
  bytes: 100,
  cleanupAfter: new Date(),
});

describe("people discovery and visual previews", () => {
  it("sorts by the displayed name, including username fallbacks and case differences", async () => {
    await prisma.wishlist.update({
      where: { id: "e2e-private-list" },
      data: { publication: "PUBLISHED", visibility: "PUBLIC" },
    });
    await prisma.user.update({
      where: { id: "e2e-owner" },
      data: { name: "Zoe" },
    });
    expect(
      (await discoverUsers({ sort: "title" })).users.map(
        (user) => user.name ?? user.username,
      ),
    ).toEqual(["e2e-member", "Zoe"]);

    await prisma.user.update({
      where: { id: "e2e-owner" },
      data: { name: "alpha 100%" },
    });
    await prisma.user.update({
      where: { id: "e2e-member" },
      data: { name: "Bravo" },
    });
    expect(
      (await discoverUsers({ sort: "title" })).users.map((user) => user.name),
    ).toEqual(["alpha 100%", "Bravo"]);
    expect(
      (await discoverUsers({ sort: "title", q: "%" })).users.map(
        (user) => user.username,
      ),
    ).toEqual(["e2e-owner"]);
    expect(
      (await discoverUsers({ sort: "title", q: "' OR true --" })).users,
    ).toEqual([]);

    await prisma.wishlist.update({
      where: { id: listId },
      data: { publication: "DRAFT" },
    });
    expect(
      (await discoverUsers({ sort: "title" })).users.map(
        (user) => user.username,
      ),
    ).toEqual(["e2e-member"]);
  });

  it("searches only public owners by name or username without revealing account data", async () => {
    for (const q of ["ada", "MÜLLER", "%", "e2e-owner"]) {
      const result = await discoverUsers({ q });
      expect(result.users).toHaveLength(1);
      expect(result.users[0]).toMatchObject({
        name: "Ada 100% Müller",
        username: "e2e-owner",
        publicListCount: 1,
        isViewer: false,
        description: "Public biography marker",
      });
      const data = JSON.stringify(result);
      for (const forbidden of [
        "owner@example.test",
        "passwordHash",
        "createdAt",
        "e2e-private-list",
      ])
        expect(data).not.toContain(forbidden);
    }
    expect((await discoverUsers({ q: "owner@example.test" })).users).toEqual(
      [],
    );
    expect((await discoverUsers({ q: "e2e-member" })).users).toEqual([]);
    expect(
      (await discoverUsers({ q: "Public biography marker" })).users,
    ).toEqual([]);
    expect((await discoverUsers({ q: "x".repeat(121) })).users).toEqual([]);
    expect((await discoverUsers({}, "e2e-owner")).users[0].isViewer).toBe(true);
    await prisma.user.update({
      where: { id: "e2e-member" },
      data: { description: "Private owner biography" },
    });
    expect(JSON.stringify(await discoverUsers({}))).not.toContain(
      "Private owner biography",
    );
  });

  it("revokes public profile and avatar visibility when the last public list or verified status disappears", async () => {
    const avatar = await prisma.media.create({
      data: { ...mediaData("portrait"), userId: "e2e-owner" },
    });
    expect(await readableImage(avatar.id, null)).not.toBeNull();
    expect((await discoverUsers({})).users[0].image?.id).toBe(avatar.id);
    for (const data of [
      { publication: "DRAFT" as const },
      { visibility: "PRIVATE" as const },
      { archivedAt: new Date() },
    ]) {
      await prisma.wishlist.update({ where: { id: listId }, data });
      expect((await discoverUsers({})).users).toEqual([]);
      expect(await readableImage(avatar.id, null)).toBeNull();
      expect(await readableImage(avatar.id, "e2e-owner")).not.toBeNull();
      await prisma.wishlist.update({
        where: { id: listId },
        data: {
          publication: "PUBLISHED",
          visibility: "PUBLIC",
          archivedAt: null,
        },
      });
    }
    await prisma.user.update({
      where: { id: "e2e-owner" },
      data: { emailVerified: false },
    });
    expect((await discoverUsers({})).users).toEqual([]);
    expect(await readableImage(avatar.id, null)).toBeNull();
  });

  it("filters lists and wishes by exact public owner while keeping ownership server-derived", async () => {
    await prisma.wish.create({
      data: { title: "Notebook", wishlistId: listId },
    });
    const lists = await discoverLists({
      owner: "e2e-owner",
      viewerId: "e2e-owner",
    });
    expect(lists.lists).toHaveLength(1);
    expect(lists.lists[0].isOwner).toBe(false);
    expect(
      (await discoverLists({ owner: "e2e-owner" }, "e2e-owner")).lists[0]
        .isOwner,
    ).toBe(true);
    expect(
      (await discoverWishes({ owner: "e2e-owner" }, "e2e-owner")).wishes[0]
        .wishlist.isOwner,
    ).toBe(true);
    expect(
      (await discoverLists({ owner: "e2e-member" }, "e2e-member")).lists,
    ).toEqual([]);
    expect((await discoverWishes({ owner: "e2e-member" })).wishes).toEqual([]);
    expect(JSON.stringify(lists)).not.toContain('"ownerId"');
  });

  it("limits preview images to three readable available wishes", async () => {
    for (let index = 0; index < 7; index++) {
      await prisma.wish.create({
        data: {
          id: `e2e-preview-${index}`,
          title: `Preview ${index}`,
          wishlistId: listId,
          hidden: index === 4,
          fulfilledAt: index === 5 ? new Date() : null,
          image: { create: mediaData(`preview-${index}`) },
          ...(index === 6
            ? { reservations: { create: { userId: "e2e-member" } } }
            : {}),
        },
      });
    }
    const list = (await discoverLists({})).lists[0];
    expect(list.availableWishCount).toBe(4);
    expect(list.previewImages).toHaveLength(3);
    for (const image of list.previewImages)
      expect(["preview-4", "preview-5", "preview-6"]).not.toContain(image.alt);
    const owned = await readOwnedWishlists("e2e-owner");
    expect(owned.lists[0].previewImages).toEqual(list.previewImages);
    expect((await readOwnedWishlists("e2e-member")).lists).not.toContainEqual(
      expect.objectContaining({ id: listId }),
    );
    await prisma.membership.create({
      data: { wishlistId: listId, userId: "e2e-member", role: "MEMBER" },
    });
    await prisma.wishlist.update({
      where: { id: listId },
      data: { visibility: "PRIVATE" },
    });
    expect((await discoverLists({})).lists).toEqual([]);
    expect(
      (await readOwnedWishlists("e2e-owner")).lists[0].previewImages,
    ).toEqual(list.previewImages);
    await prisma.wishlist.update({
      where: { id: listId },
      data: { publication: "DRAFT" },
    });
    const draftPreviews = (await readOwnedWishlists("e2e-owner")).lists[0]
      .previewImages;
    expect(draftPreviews).toHaveLength(3);
    expect(draftPreviews[0].alt).toBe("preview-6");
    for (const image of draftPreviews)
      expect(["preview-4", "preview-5"]).not.toContain(image.alt);
  });

  it("paginates people with stable ordering and counts only public lists", async () => {
    const { passwordHash } = await prisma.user.findUniqueOrThrow({
      where: { id: "e2e-owner" },
      select: { passwordHash: true },
    });
    for (let index = 0; index < 21; index++) {
      await prisma.user.create({
        data: {
          id: `e2e-person-${index}`,
          username: `e2e-person-${index}`,
          name: "Same name",
          email: `person-${index}@example.test`,
          emailVerified: true,
          passwordHash,
          ownedLists: {
            create: {
              id: `e2e-person-list-${index}`,
              title: "Public collection",
              publication: "PUBLISHED",
              memberships: {
                create: { userId: `e2e-person-${index}`, role: "ADMIN" },
              },
            },
          },
        },
      });
    }
    const first = await discoverUsers({ q: "Same name", sort: "title" });
    const second = await discoverUsers({
      q: "Same name",
      sort: "title",
      page: "2",
    });
    expect(first.users).toHaveLength(20);
    expect(first.hasNextPage).toBe(true);
    expect(second.users).toHaveLength(1);
    expect(second.hasNextPage).toBe(false);
    expect(
      new Set([...first.users, ...second.users].map(({ username }) => username))
        .size,
    ).toBe(21);
  });
});
