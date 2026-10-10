import type { Prisma } from "@/generated/prisma/client";

export const publicLists = {
  publication: "PUBLISHED",
  visibility: "PUBLIC",
  archivedAt: null,
} satisfies Prisma.WishlistWhereInput;

export const publicOwners = {
  emailVerified: true,
  ownedLists: { some: publicLists },
} satisfies Prisma.UserWhereInput;

export const availableWishes = {
  hidden: false,
  fulfilledAt: null,
  reservations: { none: { endedAt: null } },
} satisfies Prisma.WishWhereInput;
