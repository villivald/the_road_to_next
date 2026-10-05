import sharp from "sharp";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  deleteAccount,
  readDeletionImpact,
} from "@/features/account/service/account";
import { authenticate } from "@/features/auth/service/accounts";
import {
  readGuestImage,
  readGuestList,
  readGuestWish,
  readGuestWishes,
  resolveGuestLink,
} from "@/features/guest/service/access";
import {
  createGuestLink,
  readGuestLinks,
  revokeGuestLink,
} from "@/features/guest/service/links";
import { readableImage, replaceImage } from "@/features/media/service/media";
import { mediaStorage } from "@/features/media/service/storage";
import {
  readWishlist,
  setWishlistPublication,
} from "@/features/wishlist/service/lists";
import { prisma } from "@/lib/prisma";
import { assertTestDatabase } from "../e2e/environment";
import { accounts, resetFixtures } from "../e2e/seed";

const request = vi.hoisted(() => ({ token: "" }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: request.token }) }),
}));
import { GET as guestImage } from "@/app/guest/lists/[listId]/media/[id]/route";

assertTestDatabase(process.env);
const listId = "e2e-guest-list";
let owner: Awaited<ReturnType<typeof authenticate>>;
let member: Awaited<ReturnType<typeof authenticate>>;
const create = (days = 7) =>
  createGuestLink(owner.user.id, owner.session.id, listId, {
    label: "Family",
    days,
  });
const imageRequest = (id: string) =>
  guestImage(
    new Request(`http://localhost/guest/lists/${listId}/media/${id}`),
    { params: Promise.resolve({ listId, id }) },
  );

beforeEach(async () => {
  await resetFixtures();
  request.token = "";
  owner = await authenticate(accounts.owner.email, accounts.owner.password);
  member = await authenticate(accounts.member.email, accounts.member.password);
  await prisma.premiumGrant.create({
    data: {
      userId: owner.user.id,
      startsAt: new Date(Date.now() - 86400000),
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  await prisma.wishlist.create({
    data: {
      id: listId,
      title: "Private guest list",
      ownerId: owner.user.id,
      publication: "PUBLISHED",
      visibility: "PRIVATE",
      reservationsEnabled: true,
      memberships: { create: { userId: owner.user.id, role: "ADMIN" } },
      wishes: {
        create: [
          {
            id: "e2e-guest-visible",
            title: "Available wish",
            authorId: owner.user.id,
          },
          {
            id: "e2e-guest-hidden",
            title: "Hidden secret",
            hidden: true,
            authorId: owner.user.id,
          },
          {
            id: "e2e-guest-fulfilled",
            title: "Fulfilled secret",
            fulfilledAt: new Date(),
            authorId: owner.user.id,
          },
          {
            id: "e2e-guest-reserved",
            title: "Reserved secret",
            authorId: owner.user.id,
            reservations: { create: { userId: owner.user.id } },
          },
        ],
      },
    },
  });
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await resetFixtures();
  await prisma.$disconnect();
});

describe("guest access", () => {
  it("stores only a token hash and gives access only to the scoped published list", async () => {
    const link = await create();
    expect(link.token).toMatch(/^[a-z2-7]{32}$/);
    const record = await prisma.guestLink.findUniqueOrThrow({
      where: { id: link.id },
    });
    expect(record.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(record)).not.toContain(link.token);
    expect(await resolveGuestLink(link.token)).toMatchObject({
      wishlistId: listId,
    });
    expect(await readGuestList(listId, link.token)).toMatchObject({
      title: "Private guest list",
    });
    expect(await readGuestList("e2e-private-list", link.token)).toBeNull();
    expect(await readGuestList(listId, "invalid")).toBeNull();
    expect(await readGuestList(listId, record.tokenHash)).toBeNull();
    expect(await readWishlist(listId, null)).toBeNull();
    const managed = JSON.stringify(await readGuestLinks(listId, owner.user.id));
    expect(managed).not.toContain(link.token);
    expect(managed).not.toContain(record.tokenHash);
    expect(await readGuestLinks(listId, member.user.id)).toBeNull();
  });

  it("excludes hidden, fulfilled and reserved wishes from results and direct reads without leaking identities", async () => {
    const { token } = await create();
    const result = await readGuestWishes(listId, token);
    expect(result.wishes.map(({ title }) => title)).toEqual(["Available wish"]);
    for (const id of [
      "e2e-guest-hidden",
      "e2e-guest-fulfilled",
      "e2e-guest-reserved",
      "e2e-wish",
    ]) {
      expect(await readGuestWish(listId, id, token)).toBeNull();
    }
    expect(JSON.stringify(result)).not.toContain(owner.user.id);
    expect(JSON.stringify(result)).not.toContain("reservation");
    await prisma.reservation.create({
      data: { wishId: "e2e-guest-visible", userId: owner.user.id },
    });
    expect((await readGuestWishes(listId, token)).wishes).toEqual([]);
  });

  it.each(["expired", "revoked", "archived", "draft", "deleted"])(
    "denies %s links on every content read",
    async (state) => {
      const link = await create();
      if (state === "expired")
        await prisma.guestLink.update({
          where: { id: link.id },
          data: {
            createdAt: new Date(Date.now() - 86400000),
            expiresAt: new Date(Date.now() - 1),
          },
        });
      if (state === "revoked")
        await revokeGuestLink(owner.user.id, owner.session.id, listId, link.id);
      if (state === "archived")
        await prisma.wishlist.update({
          where: { id: listId },
          data: { archivedAt: new Date() },
        });
      if (state === "draft")
        await setWishlistPublication(owner.user.id, listId, "DRAFT");
      if (state === "deleted")
        await prisma.wishlist.delete({ where: { id: listId } });
      expect(await resolveGuestLink(link.token)).toBeNull();
      expect(await readGuestList(listId, link.token)).toBeNull();
      expect(
        await readGuestWish(listId, "e2e-guest-visible", link.token),
      ).toBeNull();
      expect((await readGuestWishes(listId, link.token)).wishes).toEqual([]);
    },
  );

  it("requires the owner's Premium for creation while honoring existing links and revocation after expiry", async () => {
    const link = await create();
    await prisma.membership.create({
      data: { wishlistId: listId, userId: member.user.id, role: "ADMIN" },
    });
    await createGuestLink(member.user.id, member.session.id, listId, {
      label: "Admin link",
      days: 1,
    });
    await prisma.premiumGrant.updateMany({
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    await prisma.premiumGrant.create({
      data: {
        userId: member.user.id,
        startsAt: new Date(Date.now() - 1000),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    await expect(create()).rejects.toThrow("Active Premium");
    await expect(
      createGuestLink(member.user.id, member.session.id, listId, {
        label: "No",
        days: 1,
      }),
    ).rejects.toThrow("Active Premium");
    expect(await readGuestList(listId, link.token)).not.toBeNull();
    await revokeGuestLink(member.user.id, member.session.id, listId, link.id);
    expect(await readGuestList(listId, link.token)).toBeNull();
  });

  it("rejects invalid validity, forged sessions, members, and cross-list revocation", async () => {
    for (const days of [0, 31, 1.5])
      await expect(create(days)).rejects.toThrow();
    await expect(
      createGuestLink(owner.user.id, member.session.id, listId, {
        label: "No",
        days: 7,
      }),
    ).rejects.toThrow("session expired");
    await prisma.membership.create({
      data: { wishlistId: listId, userId: member.user.id, role: "MEMBER" },
    });
    await expect(
      createGuestLink(member.user.id, member.session.id, listId, {
        label: "No",
        days: 7,
      }),
    ).rejects.toThrow("permission");
    const link = await create();
    await expect(
      revokeGuestLink(member.user.id, member.session.id, listId, link.id),
    ).rejects.toThrow("permission");
    await revokeGuestLink(
      member.user.id,
      member.session.id,
      "e2e-private-list",
      link.id,
    );
    expect(await resolveGuestLink(link.token)).not.toBeNull();
    await prisma.session.delete({ where: { id: owner.session.id } });
    await expect(create()).rejects.toThrow("session expired");
  });

  it("preserves link expiry on ownership transfer and restores unpublished content only while a link is valid", async () => {
    const link = await create();
    await setWishlistPublication(owner.user.id, listId, "DRAFT");
    expect(await resolveGuestLink(link.token)).toBeNull();
    await setWishlistPublication(owner.user.id, listId, "PUBLISHED");
    await prisma.membership.create({
      data: { wishlistId: listId, userId: member.user.id, role: "ADMIN" },
    });
    await deleteAccount(owner.user.id, owner.session.id, {
      password: accounts.owner.password,
      confirmation: "DELETE",
      impactToken: (await readDeletionImpact(owner.user.id)).impactToken,
    });
    expect(await resolveGuestLink(link.token)).toMatchObject({
      expiresAt: link.expiresAt,
    });
    await expect(
      createGuestLink(member.user.id, member.session.id, listId, {
        label: "No",
        days: 7,
      }),
    ).rejects.toThrow("Active Premium");
  });

  it("paginates without exposing excluded wishes and lists only bounded link metadata", async () => {
    const link = await create();
    await prisma.wish.createMany({
      data: Array.from({ length: 24 }, (_, index) => ({
        id: `e2e-guest-page-${index}`,
        wishlistId: listId,
        title: `Wish ${index}`,
      })),
    });
    const first = await readGuestWishes(listId, link.token);
    const second = await readGuestWishes(listId, link.token, 2);
    expect(first.wishes).toHaveLength(20);
    expect(first.hasNextPage).toBe(true);
    expect(second.wishes).toHaveLength(5);
    expect(
      new Set([...first.wishes, ...second.wishes].map(({ id }) => id)).size,
    ).toBe(25);
    await Promise.all(Array.from({ length: 20 }, () => create()));
    expect(
      (await readGuestLinks(listId, owner.user.id))?.guestLinks,
    ).toHaveLength(20);
    expect(
      (await readGuestLinks(listId, owner.user.id, 2))?.guestLinks,
    ).toHaveLength(1);
  });

  it("protects images before and after storage reads, never exposing avatars or other lists", async () => {
    const bytes = await sharp({
      create: { width: 20, height: 20, channels: 3, background: "green" },
    })
      .png()
      .toBuffer();
    const image = await replaceImage(
      owner.user.id,
      { kind: "wish", listId, wishId: "e2e-guest-visible" },
      "Guest image",
      bytes,
    );
    const avatar = await replaceImage(
      owner.user.id,
      { kind: "avatar" },
      "Private avatar",
      bytes,
    );
    const link = await create();
    request.token = link.token;
    expect(await readGuestImage(listId, avatar.id, link.token)).toBeNull();
    expect(await readableImage(image.id, null)).toBeNull();
    const response = await imageRequest(image.id);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    await response.arrayBuffer();
    const get = mediaStorage.get;
    vi.spyOn(mediaStorage, "get").mockImplementationOnce(async (...args) => {
      const body = await get(...args);
      await revokeGuestLink(owner.user.id, owner.session.id, listId, link.id);
      return body;
    });
    expect((await imageRequest(image.id)).status).toBe(404);
    expect(await readGuestImage(listId, image.id, link.token)).toBeNull();
  });

  it("loses media access when a wish becomes reserved even though the link remains valid", async () => {
    const bytes = await sharp({
      create: { width: 20, height: 20, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer();
    const image = await replaceImage(
      owner.user.id,
      { kind: "wish", listId, wishId: "e2e-guest-visible" },
      "Guest image",
      bytes,
    );
    const link = await create();
    expect(await readGuestImage(listId, image.id, link.token)).not.toBeNull();
    await prisma.reservation.create({
      data: { wishId: "e2e-guest-visible", userId: owner.user.id },
    });
    expect(await readGuestImage(listId, image.id, link.token)).toBeNull();
    expect(await resolveGuestLink(link.token)).not.toBeNull();
  });
});
