import { lockManagedWishlist } from "@/features/wishlist/service/lists";
import type { Prisma } from "@/generated/prisma/client";
import { requirePremium } from "./entitlements";

// Use for new premium list operations. Read access and ordinary content or
// privacy-preserving maintenance keep their existing authorization policies.
export const lockPremiumWishlist = async (
  tx: Prisma.TransactionClient,
  listId: string,
  actorId: string,
) => {
  await lockManagedWishlist(tx, listId, actorId);
  const list = await tx.wishlist.findUniqueOrThrow({
    where: { id: listId },
    select: { ownerId: true },
  });
  await requirePremium(list.ownerId!, tx);
};
