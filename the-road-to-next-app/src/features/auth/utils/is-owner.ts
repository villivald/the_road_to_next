import { User } from "@/generated/prisma/browser";

type Entity = {
  userId: string | null;
};

export const isOwner = (
  authUser: Pick<User, "id"> | null | undefined,
  entity: Entity | null | undefined,
) => {
  if (!authUser || !entity) {
    return false;
  }

  if (!entity.userId) {
    return false;
  }

  if (entity.userId !== authUser.id) {
    return false;
  } else {
    return true;
  }
};
