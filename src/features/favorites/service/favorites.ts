import { consumeRateLimit, lockUser } from "@/features/auth/service/security";
import {
  availableWishes,
  publicLists,
  publicOwners,
} from "@/features/discovery/service/access";
import { imageSelection } from "@/features/media/types";
import { readableWishes } from "@/features/wish/service/access";
import { wishPreviewSelection } from "@/features/wish/service/preview";
import { readableLists } from "@/features/wishlist/service/access";
import { lockWishlist } from "@/features/wishlist/service/lock";
import { prisma } from "@/lib/prisma";
import type { FavoriteKind } from "../types";
import { favoriteInput, parseFavoritesQuery } from "./schemas";

export class FavoriteError extends Error {}

const unavailable = "This item is unavailable or you no longer have access.";

export const setFavorite = async (userId: string, input: unknown) => {
  const { kind, targetId, saved } = favoriteInput.parse(input);
  await consumeRateLimit("favorite-change", userId, 100, 10 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    if (
      !(await tx.user.count({ where: { id: userId, emailVerified: true } }))
    ) {
      throw new FavoriteError("Verify your email to manage favorites.");
    }

    if (kind === "list") {
      const where = { userId, wishlistId: targetId };
      if (!saved) {
        await tx.favoriteList.deleteMany({ where });
        return;
      }
      await lockWishlist(tx, targetId);
      if (
        !(await tx.wishlist.count({
          where: { id: targetId, ...readableLists(userId) },
        }))
      ) {
        throw new FavoriteError(unavailable);
      }
      await tx.favoriteList.upsert({
        where: { userId_wishlistId: where },
        create: where,
        update: {},
      });
    } else if (kind === "wish") {
      const where = { userId, wishId: targetId };
      if (!saved) {
        await tx.favoriteWish.deleteMany({ where });
        return;
      }
      const parent = await tx.wish.findUnique({
        where: { id: targetId },
        select: { wishlistId: true },
      });
      if (!parent) throw new FavoriteError(unavailable);
      await lockWishlist(tx, parent.wishlistId);
      if (
        !(await tx.wish.count({
          where: { id: targetId, ...readableWishes(userId, true) },
        }))
      ) {
        throw new FavoriteError(unavailable);
      }
      await tx.favoriteWish.upsert({
        where: { userId_wishId: where },
        create: where,
        update: {},
      });
    } else {
      if (!saved) {
        await tx.favoritePerson.deleteMany({
          where: { userId, person: { username: targetId } },
        });
        return;
      }
      const person = await tx.user.findFirst({
        where: { username: targetId, ...publicOwners },
        select: { id: true },
      });
      if (!person) throw new FavoriteError(unavailable);
      const where = { userId, personId: person.id };
      await tx.favoritePerson.upsert({
        where: { userId_personId: where },
        create: where,
        update: {},
      });
    }
  });
};

// Bounded to the visible page, with no per-card queries or other users' bookmarks.
export const readFavoriteIds = async (
  userId: string | null,
  kind: FavoriteKind,
  targetIds: string[],
): Promise<string[]> => {
  if (!userId || !targetIds.length) return [];
  const where = { userId, user: { emailVerified: true } };
  if (kind === "list") {
    const rows = await prisma.favoriteList.findMany({
      where: { ...where, wishlistId: { in: targetIds } },
      select: { wishlistId: true },
    });
    return rows.map(({ wishlistId }) => wishlistId);
  }
  if (kind === "wish") {
    const rows = await prisma.favoriteWish.findMany({
      where: { ...where, wishId: { in: targetIds } },
      select: { wishId: true },
    });
    return rows.map(({ wishId }) => wishId);
  }
  const rows = await prisma.favoritePerson.findMany({
    where: { ...where, person: { username: { in: targetIds } } },
    select: { person: { select: { username: true } } },
  });
  return rows.map(({ person }) => person.username);
};

export const readFavorites = async (
  userId: string,
  query: { view?: string; page?: string } = {},
) => {
  const { view, page } = parseFavoritesQuery(query);
  const where = { userId, user: { emailVerified: true } };
  const pagination = {
    orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
    skip: (page - 1) * 20,
    take: 21,
  };

  if (view === "lists") {
    const rows = await prisma.favoriteList.findMany({
      ...pagination,
      where: { ...where, wishlist: readableLists(userId) },
      select: {
        wishlist: {
          select: {
            id: true,
            ownerId: true,
            title: true,
            description: true,
            publication: true,
            visibility: true,
            image: imageSelection,
            wishes: wishPreviewSelection,
            reservationsEnabled: true,
            memberships: {
              where: { userId, role: "ADMIN" },
              select: { role: true },
              take: 1,
            },
            _count: { select: { wishes: { where: availableWishes } } },
          },
        },
      },
    });
    return {
      view,
      page,
      hasNextPage: rows.length > 20 && page < 1000,
      lists: rows
        .slice(0, 20)
        .map(
          ({
            wishlist: { wishes, ownerId, memberships, _count, ...list },
          }) => ({
            ...list,
            isOwner: ownerId === userId,
            canManage: memberships.length > 0,
            availableWishCount: _count.wishes,
            previewImages: wishes.flatMap(({ image }) =>
              image ? [image] : [],
            ),
          }),
        ),
    };
  }
  if (view === "wishes") {
    const rows = await prisma.favoriteWish.findMany({
      ...pagination,
      where: { ...where, wish: readableWishes(userId, true) },
      select: {
        wish: {
          select: {
            id: true,
            title: true,
            priceMinor: true,
            currency: true,
            priority: true,
            externalUrl: true,
            hidden: true,
            fulfilledAt: true,
            image: imageSelection,
            wishlist: {
              select: {
                id: true,
                title: true,
                ownerId: true,
                publication: true,
                reservationsEnabled: true,
                memberships: {
                  where: { userId, role: "ADMIN" },
                  select: { role: true },
                  take: 1,
                },
              },
            },
            reservations: {
              where: { endedAt: null },
              select: { userId: true },
              take: 1,
            },
          },
        },
      },
    });
    return {
      view,
      page,
      hasNextPage: rows.length > 20 && page < 1000,
      wishes: rows.slice(0, 20).map(
        ({
          wish: {
            reservations,
            wishlist: { ownerId, memberships, publication, ...wishlist },
            ...wish
          },
        }) => ({
          ...wish,
          wishlist: { ...wishlist, isOwner: ownerId === userId },
          canManage: memberships.length > 0,
          canReserve:
            wishlist.reservationsEnabled &&
            publication === "PUBLISHED" &&
            !wish.hidden &&
            !wish.fulfilledAt &&
            reservations.length === 0,
          isReserved: reservations.length > 0,
          isReservedByYou: reservations.some(
            (reservation) => reservation.userId === userId,
          ),
        }),
      ),
    };
  }
  const rows = await prisma.favoritePerson.findMany({
    ...pagination,
    where: { ...where, person: publicOwners },
    select: {
      person: {
        select: {
          id: true,
          username: true,
          name: true,
          description: true,
          image: imageSelection,
          _count: { select: { ownedLists: { where: publicLists } } },
        },
      },
    },
  });
  return {
    view,
    page,
    hasNextPage: rows.length > 20 && page < 1000,
    people: rows.slice(0, 20).map(({ person: { id, _count, ...person } }) => ({
      ...person,
      publicListCount: _count.ownedLists,
      isViewer: id === userId,
    })),
  };
};
