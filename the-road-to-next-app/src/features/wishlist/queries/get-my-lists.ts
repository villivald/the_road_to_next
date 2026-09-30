import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { prisma } from "@/lib/prisma";

export const getMyLists = async () => {
  const { user } = await getAuthOrRedirect();

  return prisma.wishlist.findMany({
    where: { ownerId: user.id, archivedAt: null },
    select: { id: true, title: true, publication: true, visibility: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
  });
};
