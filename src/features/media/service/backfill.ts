import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { IMAGE_VARIANT_VERSION } from "../variants";
import { backfillFailureMessage, type BackfillStage } from "./backfill-failure";
import { mediaStorage } from "./storage";
import { prepareImageVariants } from "./validation";
import { storePreparedImage } from "./variants";

const attached = {
  OR: [
    { wishlistId: { not: null } },
    { wishId: { not: null } },
    { userId: { not: null } },
  ],
};

export const pendingImageBackfill = {
  state: "READY" as const,
  variantVersion: { lt: IMAGE_VARIANT_VERSION },
  ...attached,
};

export const backfillImageVariants = async (
  limit = 100,
  onFailure?: (failure: {
    imageId: string;
    stage: BackfillStage;
    message: string;
  }) => void,
) => {
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new Error("Choose a backfill limit between 1 and 500.");
  }
  const candidates = await prisma.media.findMany({
    where: pendingImageBackfill,
    orderBy: { id: "asc" },
    take: limit,
  });
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const media of candidates) {
    let stage: BackfillStage = "read-source";
    try {
      const body = await mediaStorage.get(media.provider, media.pathname);
      if (!body) throw new Error("Source image unavailable");
      const data = Buffer.from(
        await new Response(body as BodyInit).arrayBuffer(),
      );
      stage = "generate-variants";
      const variants = await prepareImageVariants(data, media, !!media.userId);
      if (!variants.length) {
        stage = "activate";
        const result = await prisma.media.updateMany({
          where: { id: media.id, ...pendingImageBackfill },
          data: { variantVersion: IMAGE_VARIANT_VERSION },
        });
        if (result.count) processed++;
        else skipped++;
        continue;
      }

      // Stage under a new UUID: concurrent removal cannot orphan writes to old paths.
      stage = "write-files";
      const staged = await storePreparedImage({
        data,
        variants,
        provider: media.provider,
        alt: media.alt,
        width: media.width,
        height: media.height,
        bytes: data.byteLength,
      });
      stage = "activate";
      const swapped = await prisma.$transaction(async (tx) => {
        const changed = await tx.media.updateMany({
          where: {
            id: media.id,
            pathname: media.pathname,
            ...pendingImageBackfill,
          },
          // Release the unique pathname inside this transaction; no file uses this path.
          data: { pathname: `images/${randomUUID()}.webp` },
        });
        if (!changed.count) return false;
        // The staging row becomes the cleanup record for the original files.
        await tx.media.update({
          where: { id: staged.id },
          data: {
            pathname: media.pathname,
            variantWidths: media.variantWidths,
            variantVersion: media.variantVersion,
            cleanupAfter: new Date(),
          },
        });
        await tx.media.update({
          where: { id: media.id },
          data: {
            pathname: staged.pathname,
            variantWidths: staged.variantWidths,
            variantVersion: IMAGE_VARIANT_VERSION,
          },
        });
        return true;
      });
      if (swapped) processed++;
      else {
        skipped++;
        await prisma.media.updateMany({
          where: { id: staged.id, state: "PENDING" },
          data: { cleanupAfter: new Date() },
        });
      }
    } catch (error) {
      // Pending rows retain all intended paths for the normal cleanup worker.
      failed++;
      onFailure?.({
        imageId: media.id,
        stage,
        message: backfillFailureMessage(stage, error),
      });
    }
  }

  return {
    processed,
    skipped,
    failed,
    remaining: await prisma.media.count({ where: pendingImageBackfill }),
  };
};
