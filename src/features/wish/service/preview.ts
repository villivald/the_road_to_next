import { imageSelection } from "@/features/media/types";
import type { Prisma } from "@/generated/prisma/client";

export const wishPreviewSelection = {
  where: {
    hidden: false,
    fulfilledAt: null,
    reservations: { none: { endedAt: null } },
    image: { state: "READY" },
  },
  select: { image: imageSelection },
  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  take: 3,
} satisfies Prisma.WishFindManyArgs;
