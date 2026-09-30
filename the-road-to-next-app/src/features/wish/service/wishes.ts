import { manageableLists } from "@/features/wishlist/service/access";
import { lockManagedWishlist } from "@/features/wishlist/service/lists";
import { wishlistIdSchema } from "@/features/wishlist/service/schemas";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { readableWishes } from "./access";
import {
  wishSchema,
  wishSortSchema,
  wishTransitionSchema,
  wishViewSchema,
} from "./schemas";

export class WishError extends Error {}

const wishFields = {
  id: true,
  title: true,
  description: true,
  externalUrl: true,
  priceMinor: true,
  currency: true,
  priority: true,
  hidden: true,
  fulfilledAt: true,
} satisfies Prisma.WishSelect;

const reservationStatus = {
  _count: { select: { reservations: { where: { endedAt: null } } } },
} satisfies Prisma.WishSelect;

const orderings = {
  newest: [{ createdAt: "desc" }, { id: "desc" }],
  oldest: [{ createdAt: "asc" }, { id: "asc" }],
  priority: [
    { priority: { sort: "desc", nulls: "last" } },
    { createdAt: "desc" },
    { id: "desc" },
  ],
  title: [{ title: "asc" }, { id: "asc" }],
} satisfies Record<string, Prisma.WishOrderByWithRelationInput[]>;

export const readListWishes = async (
  listId: string,
  userId: string | null,
  options: { sort?: string; view?: string; page?: number } = {},
) => {
  const sort = wishSortSchema.parse(options.sort);
  const view = wishViewSchema.parse(options.view);
  const requestedPage = options.page ?? 1;
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, 10000)
      : 1;

  const results = await prisma.wish.findMany({
    where: {
      wishlistId: listId,
      ...readableWishes(userId),
      fulfilledAt: view === "fulfilled" ? { not: null } : null,
    },
    select: { ...wishFields, ...reservationStatus },
    orderBy: orderings[sort],
    skip: (page - 1) * 20,
    take: 21,
  });

  return {
    wishes: results.slice(0, 20).map(({ _count, ...wish }) => ({
      ...wish,
      isReserved: _count.reservations > 0,
    })),
    hasNextPage: results.length > 20,
    page,
    sort,
    view,
  };
};

export const readWish = async (
  listId: string,
  wishId: string,
  userId: string | null,
  manage = false,
) => {
  if (
    ![listId, wishId].every((id) => wishlistIdSchema.safeParse(id).success) ||
    (manage && !userId)
  ) {
    return null;
  }

  const wish = await prisma.wish.findFirst({
    where: {
      id: wishId,
      wishlistId: listId,
      ...(manage && userId
        ? { wishlist: manageableLists(userId) }
        : readableWishes(userId, true)),
    },
    select: {
      ...wishFields,
      ...reservationStatus,
      wishlist: {
        select: {
          id: true,
          title: true,
          memberships: {
            where: {
              userId: userId ?? "",
              role: "ADMIN",
              user: { emailVerified: true },
            },
            select: { role: true },
          },
        },
      },
      reservations: {
        where: { userId: userId ?? "", endedAt: null },
        select: { id: true },
      },
    },
  });

  if (!wish) {
    return null;
  }

  const {
    wishlist: { memberships, ...wishlist },
    reservations,
    _count,
    ...details
  } = wish;

  return {
    ...details,
    wishlist,
    canManage: memberships.length > 0,
    isReserved: _count.reservations > 0,
    isReservedByYou: reservations.length > 0,
  };
};

export const createWish = async (
  userId: string,
  listId: string,
  input: unknown,
) => {
  const data = wishSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    await lockManagedWishlist(tx, listId, userId);

    return tx.wish.create({
      data: { ...data, wishlistId: listId, authorId: userId },
      select: { id: true },
    });
  });
};

const lockManagedWish = async (
  tx: Prisma.TransactionClient,
  userId: string,
  listId: string,
  wishId: string,
) => {
  wishlistIdSchema.parse(wishId);
  await lockManagedWishlist(tx, listId, userId);

  const wish = await tx.wish.findFirst({
    where: { id: wishId, wishlistId: listId },
    select: { id: true, fulfilledAt: true },
  });

  if (!wish) {
    throw new WishError(
      "This wish is unavailable or you do not have permission to change it.",
    );
  }

  return wish;
};

export const updateWish = async (
  userId: string,
  listId: string,
  wishId: string,
  input: unknown,
) => {
  const data = wishSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    await lockManagedWish(tx, userId, listId, wishId);

    if (data.hidden) {
      await tx.reservation.updateMany({
        where: { wishId, endedAt: null },
        data: { endedAt: new Date() },
      });
    }

    await tx.wish.update({ where: { id: wishId }, data });
  });
};

export const transitionWish = async (
  userId: string,
  listId: string,
  wishId: string,
  value: unknown,
) => {
  const transition = wishTransitionSchema.parse(value);

  await prisma.$transaction(async (tx) => {
    const wish = await lockManagedWish(tx, userId, listId, wishId);

    if (transition === "hide" || transition === "fulfill") {
      await tx.reservation.updateMany({
        where: { wishId, endedAt: null },
        data: { endedAt: new Date() },
      });
    }

    const data =
      transition === "hide" || transition === "unhide"
        ? { hidden: transition === "hide" }
        : {
            fulfilledAt:
              transition === "fulfill"
                ? (wish.fulfilledAt ?? new Date())
                : null,
          };

    await tx.wish.update({ where: { id: wishId }, data });
  });
};

export const deleteWish = async (
  userId: string,
  listId: string,
  wishId: string,
) => {
  await prisma.$transaction(async (tx) => {
    await lockManagedWish(tx, userId, listId, wishId);
    await tx.wish.delete({ where: { id: wishId } });
  });
};
