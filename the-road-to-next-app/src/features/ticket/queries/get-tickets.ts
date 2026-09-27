import { getAuth } from "@/features/auth/actions/get-auth";
import { isOwner } from "@/features/auth/utils/is-owner";
import { getActiveOrganization } from "@/features/organization/queries/get-active-organization";
import { prisma } from "@/lib/prisma";
import { getTicketPermissions } from "../permissions/get-ticket-permissions";
import { ParsedSearchParams } from "../search-params";

export const getTickets = async (
  userId: string | undefined,
  byOrganization: boolean,
  searchParams: ParsedSearchParams,
) => {
  const { user } = await getAuth();
  const activeOrganization = await getActiveOrganization();

  const where = {
    userId,
    title: {
      contains: searchParams.search,
      mode: "insensitive" as const,
    },
    ...(byOrganization && activeOrganization
      ? {
          organizationId: activeOrganization.id,
        }
      : {}),
  };

  const take = Math.min(100, Math.max(1, searchParams.size));
  const page = Math.min(1000000, Math.max(0, searchParams.page));
  const skip = take * page;

  const [tickets, count] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      skip,
      take,
      orderBy: {
        [searchParams.sortKey]: searchParams.sortValue,
      },
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    }),
    prisma.ticket.count({
      where,
    }),
  ]);

  const permissions = await getTicketPermissions({
    organizationId: activeOrganization?.id,
    userId: user?.id,
  });

  return {
    list: tickets.map((ticket) => ({
      ...ticket,
      isOwner: isOwner(user, ticket),
      permissions: {
        canDeleteTicket: isOwner(user, ticket) && permissions.canDeleteTicket,
      },
    })),
    metadata: {
      count,
      hasNextPage: count > skip + take,
    },
  };
};
