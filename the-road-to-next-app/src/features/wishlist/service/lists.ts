import { lockUser } from "@/features/auth/service/security";
import { imageSelection } from "@/features/media/types";
import { requirePremium } from "@/features/premium/service/entitlements";
import { visibilitySchema } from "@/features/sharing/service/schemas";
import { wishPreviewSelection } from "@/features/wish/service/preview";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { manageableLists, readableLists } from "./access";
import { lockWishlist } from "./lock";
import { publicationSchema, wishlistIdSchema, wishlistSchema } from "./schemas";
import { readManagedWishCounts } from "./wish-counts";

export class WishlistError extends Error {}

const listFields = {
  image: imageSelection,
  id: true,
  title: true,
  description: true,
  publication: true,
  visibility: true,
  reservationsEnabled: true,
} satisfies Prisma.WishlistSelect;

export const readWishlist = async (id: string, userId: string | null) => {
  if (!wishlistIdSchema.safeParse(id).success) {
    return null;
  }

  const list = await prisma.wishlist.findFirst({
    where: { id, ...readableLists(userId) },
    select: {
      ...listFields,
      memberships: {
        where: {
          userId: userId ?? "",
          role: "ADMIN",
          user: { emailVerified: true },
        },
        select: { role: true },
      },
    },
  });

  if (!list) {
    return null;
  }

  const { memberships, ...details } = list;

  return { ...details, canManage: memberships.length > 0 };
};

export const readManagedWishlist = (id: string, userId: string) => {
  if (!wishlistIdSchema.safeParse(id).success) {
    return Promise.resolve(null);
  }

  return prisma.wishlist.findFirst({
    where: { id, ...manageableLists(userId) },
    select: { ...listFields, ownerId: true },
  });
};

export const readOwnedWishlists = async (userId: string, page = 1) => {
  const pageSize = 20;
  const currentPage =
    Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1;
  const results = await prisma.wishlist.findMany({
    where: { ownerId: userId, ...manageableLists(userId) },
    select: { ...listFields, wishes: wishPreviewSelection },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * pageSize,
    take: pageSize + 1,
  });
  const lists = results.slice(0, pageSize);
  const counts = await readManagedWishCounts(
    userId,
    lists.map(({ id }) => id),
  );

  return {
    lists: lists.map(({ wishes, ...list }) => ({
      ...list,
      ...(counts.get(list.id) ?? {
        availableWishCount: 0,
        reservedWishCount: 0,
      }),
      previewImages: wishes.flatMap(({ image }) => (image ? [image] : [])),
    })),
    hasNextPage: results.length > pageSize,
    page: currentPage,
  };
};

export const createWishlist = async (userId: string, input: unknown) => {
  const data = wishlistSchema.parse(input);
  const visibility = visibilitySchema
    .default("PUBLIC")
    .parse(
      input && typeof input === "object" && "visibility" in input
        ? input.visibility
        : undefined,
    );

  return prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const user = await tx.user.findFirst({
      where: { id: userId, emailVerified: true },
      select: { id: true },
    });

    if (!user) {
      throw new WishlistError(
        "Sign in with a verified account to create a list.",
      );
    }

    if (visibility === "PRIVATE") await requirePremium(user.id, tx);

    return tx.wishlist.create({
      data: {
        ...data,
        description: data.description || null,
        ownerId: user.id,
        publication: "DRAFT",
        visibility,
        memberships: { create: { userId: user.id, role: "ADMIN" } },
      },
      select: { id: true },
    });
  });
};

export const lockManagedWishlist = async (
  tx: Prisma.TransactionClient,
  id: string,
  userId: string,
) => {
  await lockUser(tx, userId);
  await lockWishlist(tx, id);

  const list = await tx.wishlist.findFirst({
    where: { id, ...manageableLists(userId) },
    select: { id: true },
  });

  if (!list) {
    throw new WishlistError(
      "This list is unavailable or you do not have permission to change it.",
    );
  }
};

export const updateWishlist = async (
  userId: string,
  id: string,
  input: unknown,
) => {
  const data = wishlistSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    await lockManagedWishlist(tx, id, userId);

    await tx.wishlist.update({
      where: { id },
      data: { ...data, description: data.description || null },
    });
  });
};

export const setWishlistPublication = async (
  userId: string,
  id: string,
  value: unknown,
) => {
  const publication = publicationSchema.parse(value);

  await prisma.$transaction(async (tx) => {
    await lockManagedWishlist(tx, id, userId);

    if (publication === "DRAFT") {
      await tx.reservation.updateMany({
        where: { wish: { wishlistId: id }, endedAt: null },
        data: { endedAt: new Date() },
      });
    }

    await tx.wishlist.update({ where: { id }, data: { publication } });
  });
};

export const deleteWishlist = async (userId: string, id: string) => {
  await prisma.$transaction(async (tx) => {
    await lockManagedWishlist(tx, id, userId);

    // Wishes, memberships, and reservations cascade with their deleted list.
    await tx.wishlist.delete({ where: { id } });
  });
};
