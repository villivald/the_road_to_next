import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { prisma } from "@/lib/prisma";

export const getMemberships = async (organizationId: string) => {
  const { user } = await getAuthOrRedirect();

  const memberships = await prisma.membership.findMany({
    where: {
      organizationId,
    },
    include: {
      user: {
        select: {
          email: true,
          emailVerified: true,
          username: true,
        },
      },
    },
  });

  return memberships.map((membership) => ({
    ...membership,
    isCurrentUser: membership.userId === user.id,
  }));
};
