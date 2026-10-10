import {
  manageableLists,
  readableLists,
} from "@/features/wishlist/service/access";
import type { Prisma } from "@/generated/prisma/client";

export const readableWishes = (
  userId: string | null,
  includeOwnReservation = false,
): Prisma.WishWhereInput => ({
  wishlist: readableLists(userId),
  OR: [
    ...(userId ? [{ wishlist: manageableLists(userId) }] : []),
    {
      hidden: false,
      fulfilledAt: null,
      OR: [
        { reservations: { none: { endedAt: null } } },
        ...(includeOwnReservation && userId
          ? [
              {
                reservations: {
                  some: {
                    userId,
                    endedAt: null,
                    user: { emailVerified: true },
                  },
                },
              },
            ]
          : []),
      ],
    },
  ],
});
