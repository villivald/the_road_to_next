import { Prisma } from "@/generated/prisma";

export type CommentWithMetadata = Prisma.CommentGetPayload<{
  include: {
    user: {
      select: {
        username: true;
      };
    };
  };
}>;
