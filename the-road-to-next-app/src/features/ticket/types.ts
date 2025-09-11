import { Prisma } from "@/generated/prisma";

export type TicketWithMetadata = Prisma.TicketGetPayload<{
  include: { user: { select: { username: true } } };
}> & {
  isOwner: boolean;
  permissions: {
    canDeleteTicket: boolean;
  };
};
