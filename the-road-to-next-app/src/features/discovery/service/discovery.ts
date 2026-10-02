import { imageSelection } from "@/features/media/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { type DiscoveryQuery, parseDiscoveryQuery } from "./query";

// Discovery always uses public permissions, including for owners and admins.
const publicLists = {
  publication: "PUBLISHED",
  visibility: "PUBLIC",
  archivedAt: null,
} satisfies Prisma.WishlistWhereInput;
const availableWishes = {
  hidden: false,
  fulfilledAt: null,
  reservations: { none: { endedAt: null } },
} satisfies Prisma.WishWhereInput;

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

export const discoverLists = async (query: DiscoveryQuery) => {
  const filters = parseDiscoveryQuery({ ...query, view: "lists" });
  const lists = filters.error
    ? []
    : await prisma.wishlist.findMany({
        where: {
          ...publicLists,
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
          title: true,
          description: true,
          image: imageSelection,
          reservationsEnabled: true,
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
    lists: lists.slice(0, 20).map(({ _count, ...list }) => ({
      ...list,
      availableWishCount: _count.wishes,
    })),
    hasNextPage: !filters.error && lists.length > 20 && filters.page < 1000,
  };
};

export const discoverWishes = async (query: DiscoveryQuery) => {
  const filters = parseDiscoveryQuery({ ...query, view: "wishes" });
  const wishes = filters.error
    ? []
    : await prisma.wish.findMany({
        where: {
          ...availableWishes,
          wishlist: {
            ...publicLists,
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
            select: { id: true, title: true, reservationsEnabled: true },
          },
        },
        orderBy: wishOrder[filters.sort],
        skip: (filters.page - 1) * 20,
        take: 21,
      });

  return {
    filters,
    wishes: wishes.slice(0, 20),
    hasNextPage: !filters.error && wishes.length > 20 && filters.page < 1000,
  };
};
