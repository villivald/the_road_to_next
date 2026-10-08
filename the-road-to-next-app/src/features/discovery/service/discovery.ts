import { imageSelection } from "@/features/media/types";
import { wishPreviewSelection } from "@/features/wish/service/preview";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { availableWishes, publicLists, publicOwners } from "./access";
import { peopleOrderedByName } from "./people-order";
import { type DiscoveryQuery, parseDiscoveryQuery } from "./query";

const literalSearch = (value: string) => value.replace(/[\\%_]/g, "\\$&");

const wishOrder = {
  newest: [{ createdAt: "desc" }, { id: "desc" }],
  title: [{ title: "asc" }, { id: "asc" }],
  priority: [
    { priority: { sort: "desc", nulls: "last" } },
    { createdAt: "desc" },
    { id: "desc" },
  ],
  "price-low": [{ priceMinor: "asc" }, { id: "asc" }],
  "price-high": [{ priceMinor: "desc" }, { id: "desc" }],
} satisfies Record<string, Prisma.WishOrderByWithRelationInput[]>;

export const discoverLists = async (
  query: DiscoveryQuery,
  viewerId: string | null = null,
) => {
  const filters = parseDiscoveryQuery({ ...query, view: "lists" });
  const lists = filters.error
    ? []
    : await prisma.wishlist.findMany({
        where: {
          ...publicLists,
          ...(filters.owner
            ? { owner: { username: filters.owner, emailVerified: true } }
            : {}),
          ...(filters.reservable ? { reservationsEnabled: true } : {}),
          ...(filters.q
            ? {
                OR: [
                  {
                    title: {
                      contains: literalSearch(filters.q),
                      mode: "insensitive",
                    },
                  },
                  {
                    description: {
                      contains: literalSearch(filters.q),
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          ownerId: true,
          title: true,
          description: true,
          image: imageSelection,
          reservationsEnabled: true,
          wishes: wishPreviewSelection,
          _count: { select: { wishes: { where: availableWishes } } },
        },
        orderBy:
          filters.sort === "title"
            ? [{ title: "asc" }, { id: "asc" }]
            : [{ createdAt: "desc" }, { id: "desc" }],
        skip: (filters.page - 1) * 20,
        take: 21,
      });

  return {
    filters,
    lists: lists.slice(0, 20).map(({ _count, ownerId, wishes, ...list }) => ({
      ...list,
      isOwner: !!viewerId && ownerId === viewerId,
      previewImages: wishes.flatMap(({ image }) => (image ? [image] : [])),
      availableWishCount: _count.wishes,
    })),
    hasNextPage: !filters.error && lists.length > 20 && filters.page < 1000,
  };
};

export const discoverWishes = async (
  query: DiscoveryQuery,
  viewerId: string | null = null,
) => {
  const filters = parseDiscoveryQuery({ ...query, view: "wishes" });
  const wishes = filters.error
    ? []
    : await prisma.wish.findMany({
        where: {
          ...availableWishes,
          wishlist: {
            ...publicLists,
            ...(filters.owner
              ? { owner: { username: filters.owner, emailVerified: true } }
              : {}),
            ...(filters.reservable ? { reservationsEnabled: true } : {}),
          },
          ...(filters.q
            ? {
                OR: [
                  {
                    title: {
                      contains: literalSearch(filters.q),
                      mode: "insensitive",
                    },
                  },
                  {
                    description: {
                      contains: literalSearch(filters.q),
                      mode: "insensitive",
                    },
                  },
                  {
                    wishlist: {
                      title: {
                        contains: literalSearch(filters.q),
                        mode: "insensitive",
                      },
                    },
                  },
                ],
              }
            : {}),
          ...(filters.currency ? { currency: filters.currency } : {}),
          ...(filters.priority
            ? { priority: { gte: Number(filters.priority) } }
            : {}),
          ...(filters.minPrice !== null || filters.maxPrice !== null
            ? {
                priceMinor: {
                  ...(filters.minPrice !== null
                    ? { gte: filters.minPrice }
                    : {}),
                  ...(filters.maxPrice !== null
                    ? { lte: filters.maxPrice }
                    : {}),
                },
              }
            : {}),
        },
        select: {
          id: true,
          title: true,
          description: true,
          image: imageSelection,
          priceMinor: true,
          currency: true,
          priority: true,
          wishlist: {
            select: {
              id: true,
              title: true,
              ownerId: true,
              reservationsEnabled: true,
            },
          },
        },
        orderBy: wishOrder[filters.sort],
        skip: (filters.page - 1) * 20,
        take: 21,
      });

  return {
    filters,
    wishes: wishes
      .slice(0, 20)
      .map(({ wishlist: { ownerId, ...wishlist }, ...wish }) => ({
        ...wish,
        wishlist: { ...wishlist, isOwner: !!viewerId && ownerId === viewerId },
      })),
    hasNextPage: !filters.error && wishes.length > 20 && filters.page < 1000,
  };
};

export const discoverUsers = async (
  query: DiscoveryQuery,
  viewerId: string | null = null,
) => {
  const filters = parseDiscoveryQuery({ ...query, view: "users" });
  const orderedPeople =
    !filters.error && filters.sort === "title"
      ? await peopleOrderedByName(literalSearch(filters.q), filters.page)
      : null;
  const users = filters.error
    ? []
    : await prisma.user.findMany({
        where: {
          ...publicOwners,
          ...(orderedPeople
            ? { id: { in: orderedPeople.map(({ id }) => id) } }
            : {}),
          ...(filters.q
            ? {
                OR: [
                  {
                    name: {
                      contains: literalSearch(filters.q),
                      mode: "insensitive",
                    },
                  },
                  {
                    username: {
                      contains: literalSearch(filters.q),
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          username: true,
          name: true,
          description: true,
          image: imageSelection,
          _count: { select: { ownedLists: { where: publicLists } } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: orderedPeople ? 0 : (filters.page - 1) * 20,
        take: 21,
      });

  const positions = new Map(orderedPeople?.map(({ id }, index) => [id, index]));
  const sortedUsers = orderedPeople
    ? users.toSorted(
        (first, second) => positions.get(first.id)! - positions.get(second.id)!,
      )
    : users;

  return {
    filters,
    users: sortedUsers.slice(0, 20).map(({ id, _count, ...user }) => ({
      ...user,
      isViewer: id === viewerId,
      publicListCount: _count.ownedLists,
    })),
    hasNextPage: !filters.error && users.length > 20 && filters.page < 1000,
  };
};
