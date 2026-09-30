import { randomUUID } from "node:crypto";
import { consumeRateLimit, lockUser } from "@/features/auth/service/security";
import { readableWishes } from "@/features/wish/service/access";
import { readableLists } from "@/features/wishlist/service/access";
import { lockManagedWishlist } from "@/features/wishlist/service/lists";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { imageSelection, MediaError, type MediaTarget } from "../types";
import { mediaStorage, storageProvider } from "./storage";
import {
  imageDescriptionSchema,
  mediaTargetSchema,
  prepareImage,
} from "./validation";

const targetFields = (target: MediaTarget, userId: string) =>
  target.kind === "avatar"
    ? { userId }
    : target.kind === "list"
      ? { wishlistId: target.listId }
      : { wishId: target.wishId };

const lockTarget = async (
  tx: Prisma.TransactionClient,
  target: MediaTarget,
  userId: string,
) => {
  if (target.kind === "avatar") {
    await lockUser(tx, userId);
    const user = await tx.user.findFirst({
      where: { id: userId, emailVerified: true },
      select: { id: true },
    });

    if (!user) {
      throw new MediaError("This account is unavailable.");
    }
    return;
  }

  await lockManagedWishlist(tx, target.listId, userId);

  if (
    target.kind === "wish" &&
    !(await tx.wish.findFirst({
      where: { id: target.wishId, wishlistId: target.listId },
      select: { id: true },
    }))
  ) {
    throw new MediaError("This wish is unavailable.");
  }
};

export const authorizeImageChange = async (userId: string, input: unknown) => {
  const target = mediaTargetSchema.parse(input);
  await prisma.$transaction((tx) => lockTarget(tx, target, userId));
  return target;
};

export const replaceImage = async (
  userId: string,
  input: unknown,
  altInput: unknown,
  bytes: Buffer,
) => {
  const target = await authorizeImageChange(userId, input);
  const alt = imageDescriptionSchema.parse(altInput);
  await consumeRateLimit("image-upload", userId, 30, 60 * 60 * 1000);

  const { data, ...dimensions } = await prepareImage(
    bytes,
    target.kind === "avatar",
  );
  const pending = await prisma.media.create({
    data: {
      pathname: `images/${randomUUID()}.webp`,
      provider: storageProvider(),
      alt,
      ...dimensions,
      // Persist before the external write so timeouts/crashes still leave cleanup work.
      cleanupAfter: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await mediaStorage.put(pending.provider, pending.pathname, data);

  return prisma.$transaction(async (tx) => {
    // Recheck after storage I/O: membership or the target may have changed.
    await lockTarget(tx, target, userId);
    const fields = targetFields(target, userId);

    await tx.media.updateMany({
      where: fields,
      data: {
        userId: null,
        wishlistId: null,
        wishId: null,
        cleanupAfter: new Date(),
      },
    });
    const attached = await tx.media.updateMany({
      where: {
        id: pending.id,
        state: "PENDING",
        cleanupAfter: { gt: new Date() },
      },
      data: { ...fields, state: "READY" },
    });

    if (attached.count !== 1) {
      throw new MediaError("The upload expired. Please try again.");
    }

    return tx.media.findUniqueOrThrow({
      where: { id: pending.id },
      ...imageSelection,
    });
  });
};

export const removeImage = async (userId: string, input: unknown) => {
  const target = mediaTargetSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    await lockTarget(tx, target, userId);
    await tx.media.updateMany({
      where: targetFields(target, userId),
      data: {
        userId: null,
        wishlistId: null,
        wishId: null,
        cleanupAfter: new Date(),
      },
    });
  });
};

export const readableImage = (id: string, userId: string | null) =>
  prisma.media.findFirst({
    where: {
      id,
      state: "READY",
      OR: [
        { wishlist: readableLists(userId) },
        { wish: readableWishes(userId, true) },
        ...(userId ? [{ userId, user: { emailVerified: true } }] : []),
      ],
    },
    select: { id: true, pathname: true, provider: true },
  });

export const readAvatar = (userId: string) =>
  prisma.media.findFirst({
    where: { userId, state: "READY", user: { emailVerified: true } },
    ...imageSelection,
  });
