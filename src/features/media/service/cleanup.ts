import { prisma } from "@/lib/prisma";
import { mediaStorage } from "./storage";

export const cleanupMedia = async () => {
  const detached = { wishlistId: null, wishId: null, userId: null };
  const candidates = await prisma.media.findMany({
    where: { ...detached, cleanupAfter: { lte: new Date() } },
    select: { id: true },
    orderBy: { cleanupAfter: "asc" },
    take: 50,
  });
  let deleted = 0;
  let failed = 0;

  for (const { id } of candidates) {
    // Claim atomically against attachment and concurrent workers. Expired claims retry.
    const claimed = await prisma.media.updateManyAndReturn({
      where: { id, ...detached, cleanupAfter: { lte: new Date() } },
      data: {
        state: "DELETING",
        cleanupAfter: new Date(Date.now() + 5 * 60 * 1000),
        attempts: { increment: 1 },
      },
    });
    const media = claimed[0];

    if (!media) {
      continue;
    }

    try {
      await mediaStorage.delete(media.provider, media.pathname);
      await prisma.media.deleteMany({ where: { id, state: "DELETING" } });
      deleted++;
    } catch {
      failed++;
      await prisma.media.updateMany({
        where: { id, state: "DELETING" },
        data: {
          cleanupAfter: new Date(
            Date.now() +
              Math.min(24 * 60, 2 ** Math.min(media.attempts, 10)) * 60 * 1000,
          ),
        },
      });
    }
  }

  return { deleted, failed };
};
