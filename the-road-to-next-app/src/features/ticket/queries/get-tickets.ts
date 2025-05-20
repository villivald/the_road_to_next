import { prisma } from "@/lib/prisma";

export const getTickets = async (userId: string | undefined) => {
  return prisma.ticket.findMany({
    where: {
      userId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          username: true,
        },
      },
    },
  });
};
