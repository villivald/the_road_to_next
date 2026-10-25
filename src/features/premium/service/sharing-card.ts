import { manageableLists } from "@/features/wishlist/service/access";
import { wishlistIdSchema } from "@/features/wishlist/service/schemas";
import { prisma } from "@/lib/prisma";
import { readPremiumAccess } from "./entitlements";

// This is an explicit download by a list manager, never an open image preview.
export const readSharingCard = async (
  userId: string,
  sessionId: string,
  id: string,
) => {
  if (!wishlistIdSchema.safeParse(id).success) return null;
  const list = await prisma.wishlist.findFirst({
    where: {
      id,
      ...manageableLists(userId),
      publication: "PUBLISHED",
      memberships: {
        some: {
          userId,
          role: "ADMIN",
          user: {
            emailVerified: true,
            sessions: {
              some: { id: sessionId, expiresAt: { gt: new Date() } },
            },
          },
        },
      },
    },
    select: {
      id: true,
      title: true,
      theme: true,
      ownerId: true,
      visibility: true,
    },
  });
  if (
    !list?.ownerId ||
    (await readPremiumAccess(list.ownerId)).plan !== "PREMIUM"
  )
    return null;
  return list;
};
