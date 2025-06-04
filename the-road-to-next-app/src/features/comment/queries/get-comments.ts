"use server";

import { prisma } from "@/lib/prisma";

export const getComments = async (
  ticketId: string,
  cursor?: {
    id: string;
    createdAt: number;
  },
) => {
  const where = {
    ticketId,
  };

  const take = 3;

  // eslint-disable-next-line prefer-const
  let [comments, count] = await prisma.$transaction([
    prisma.comment.findMany({
      where,
      take: take + 1,
      cursor: cursor
        ? {
            id: cursor.id,
            createdAt: new Date(cursor.createdAt),
          }
        : undefined,
      skip: cursor ? 1 : 0,
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
    }),
    prisma.comment.count({
      where,
    }),
  ]);

  const hasNextPage = comments.length > take;

  comments = hasNextPage ? comments.slice(0, -1) : comments;

  const lastComment = comments.at(-1);

  return {
    list: comments,
    metadata: {
      count,
      hasNextPage,
      cursor: lastComment
        ? {
            id: lastComment.id,
            createdAt: lastComment.createdAt.valueOf(),
          }
        : undefined,
    },
  };
};
