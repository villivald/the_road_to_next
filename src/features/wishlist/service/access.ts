import type { Prisma } from "@/generated/prisma/client";

export const manageableLists = (userId: string): Prisma.WishlistWhereInput => ({
  archivedAt: null,
  memberships: {
    some: { userId, role: "ADMIN", user: { emailVerified: true } },
  },
});

export const readableLists = (
  userId: string | null,
): Prisma.WishlistWhereInput => ({
  archivedAt: null,
  OR: [
    { publication: "PUBLISHED", visibility: "PUBLIC" },
    ...(userId
      ? [
          manageableLists(userId),
          {
            publication: "PUBLISHED" as const,
            memberships: { some: { userId, user: { emailVerified: true } } },
          },
        ]
      : []),
  ],
});
