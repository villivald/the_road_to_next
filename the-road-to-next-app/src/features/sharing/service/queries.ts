import { readPremiumAccess } from "@/features/premium/service/entitlements";
import { manageableLists } from "@/features/wishlist/service/access";
import { prisma } from "@/lib/prisma";
import { sharingPage } from "./schemas";

export const readSharing = async (
  listId: string,
  userId: string,
  memberPage: unknown = 1,
  invitePage: unknown = 1,
) => {
  const membersPage = sharingPage(memberPage);
  const invitationsPage = sharingPage(invitePage);
  const list = await prisma.wishlist.findFirst({
    where: { id: listId, ...manageableLists(userId) },
    select: {
      id: true,
      title: true,
      ownerId: true,
      visibility: true,
      memberships: {
        orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
        skip: (membersPage - 1) * 20,
        take: 21,
        select: {
          id: true,
          userId: true,
          role: true,
          user: { select: { username: true } },
        },
      },
      invitations: {
        where: { acceptedAt: null, revokedAt: null },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (invitationsPage - 1) * 20,
        take: 21,
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          sentAt: true,
          deliveryFailedAt: true,
        },
      },
    },
  });
  if (!list) return null;
  const access = await readPremiumAccess(list.ownerId!);
  return {
    ...list,
    premium: access.plan === "PREMIUM",
    memberships: list.memberships.slice(0, 20),
    invitations: list.invitations.slice(0, 20),
    membersPage,
    invitationsPage,
    moreMembers: list.memberships.length > 20,
    moreInvitations: list.invitations.length > 20,
  };
};

export const readSharedLists = async (userId: string, input: unknown = 1) => {
  const page = sharingPage(input);
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      user: { emailVerified: true },
      wishlist: { ownerId: { not: userId }, archivedAt: null },
    },
    orderBy: [{ joinedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * 20,
    take: 21,
    select: {
      id: true,
      role: true,
      wishlist: {
        select: { id: true, title: true, publication: true, visibility: true },
      },
    },
  });
  return {
    page,
    hasNextPage: memberships.length > 20,
    lists: memberships.slice(0, 20).map(({ wishlist, ...membership }) => ({
      ...membership,
      listId: wishlist.id,
      title:
        membership.role === "ADMIN" || wishlist.publication === "PUBLISHED"
          ? wishlist.title
          : null,
    })),
  };
};
