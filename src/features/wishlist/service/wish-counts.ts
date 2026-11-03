import { prisma } from "@/lib/prisma";
import { readableLists } from "./access";

type WishCounts = {
  availableWishCount: number;
  reservedWishCount: number;
};

export const readWishCounts = async (
  userId: string | null,
  listIds: string[],
): Promise<Map<string, WishCounts>> => {
  if (!listIds.length) return new Map();

  const where = {
    wishlistId: { in: listIds },
    wishlist: readableLists(userId),
    hidden: false,
    fulfilledAt: null,
  };
  const [available, reserved] = await prisma.$transaction(
    [
      prisma.wish.groupBy({
        by: ["wishlistId"],
        where: { ...where, reservations: { none: { endedAt: null } } },
        _count: { _all: true },
      }),
      prisma.wish.groupBy({
        by: ["wishlistId"],
        where: { ...where, reservations: { some: { endedAt: null } } },
        _count: { _all: true },
      }),
    ],
    { isolationLevel: "RepeatableRead" },
  );
  const availableCounts = new Map(
    available.map(({ wishlistId, _count }) => [wishlistId, _count._all]),
  );
  const reservedCounts = new Map(
    reserved.map(({ wishlistId, _count }) => [wishlistId, _count._all]),
  );

  return new Map(
    listIds.map((id) => [
      id,
      {
        availableWishCount: availableCounts.get(id) ?? 0,
        reservedWishCount: reservedCounts.get(id) ?? 0,
      },
    ]),
  );
};
