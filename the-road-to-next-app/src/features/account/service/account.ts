import {
  AuthError,
  consumeRateLimit,
  lockUser,
} from "@/features/auth/service/security";
import { verifyPasswordHash } from "@/features/password/utils/hash-and-verify";
import { lockWishlist } from "@/features/wishlist/service/lock";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/utils/crypto";
import { deleteAccountSchema, profileSchema } from "./schemas";

const currentAccount = async (
  tx: Prisma.TransactionClient,
  userId: string,
  sessionId: string,
) => {
  const user = await tx.user.findFirst({
    where: {
      id: userId,
      emailVerified: true,
      sessions: { some: { id: sessionId, expiresAt: { gt: new Date() } } },
    },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    throw new AuthError("Your session expired. Please sign in again.");
  }
  return user;
};

export const readProfile = (userId: string) =>
  prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, description: true },
  });

export const updateProfile = async (
  userId: string,
  sessionId: string,
  input: unknown,
) => {
  const data = profileSchema.parse(input);
  await consumeRateLimit("profile-change", userId, 30, 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    await currentAccount(tx, userId, sessionId);
    await tx.user.update({
      where: { id: userId },
      data: { name: data.name || null, description: data.description || null },
    });
  });
};

const deletionImpact = async (tx: Prisma.TransactionClient, userId: string) => {
  const lists = await tx.wishlist.findMany({
    where: { ownerId: userId, archivedAt: null },
    orderBy: { id: "asc" },
    select: {
      id: true,
      title: true,
      memberships: {
        where: { userId: { not: userId }, role: "ADMIN" },
        orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
        take: 1,
        select: { userId: true, user: { select: { username: true } } },
      },
    },
  });
  const outcomes = lists.map(({ memberships, ...list }) => ({
    ...list,
    successor: memberships[0] ?? null,
  }));
  const reservations = await tx.reservation.findMany({
    where: { userId, endedAt: null },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const memberships = await tx.membership.findMany({
    where: { userId },
    select: { id: true, role: true },
    orderBy: { id: "asc" },
  });

  return {
    outcomes,
    reservationCount: reservations.length,
    membershipCount: memberships.length,
    impactToken: hashToken(
      JSON.stringify({ userId, outcomes, reservations, memberships }),
    ),
  };
};

export const readDeletionImpact = async (userId: string) => {
  const impact = await prisma.$transaction((tx) => deletionImpact(tx, userId), {
    isolationLevel: "RepeatableRead",
  });

  return {
    impactToken: impact.impactToken,
    reservationCount: impact.reservationCount,
    membershipCount: impact.membershipCount,
    transferCount: impact.outcomes.filter((list) => list.successor).length,
    archiveCount: impact.outcomes.filter((list) => !list.successor).length,
    listCount: impact.outcomes.length,
    lists: impact.outcomes.slice(0, 20).map(({ id, title, successor }) => ({
      id,
      title,
      successor: successor?.user.username ?? null,
    })),
  };
};

export const deleteAccount = async (
  userId: string,
  sessionId: string,
  input: unknown,
) => {
  const data = deleteAccountSchema.parse(input);
  await consumeRateLimit("account-delete", userId, 5, 15 * 60 * 1000);
  const user = await currentAccount(prisma, userId, sessionId);

  if (!(await verifyPasswordHash(user.passwordHash, data.password))) {
    throw new AuthError("Incorrect current password");
  }

  await prisma.$transaction(
    async (tx) => {
      // Deletions can transfer to each other. Serialize this rare operation before
      // taking user/list locks; other account and content operations remain concurrent.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(8108, 1)::text`;
      await lockUser(tx, userId, true);
      const current = await currentAccount(tx, userId, sessionId);

      if (current.passwordHash !== user.passwordHash) {
        throw new AuthError("Your password changed. Please sign in again.");
      }

      // Lock every parent affected by cascades, in one consistent order.
      const affected = await tx.wishlist.findMany({
        where: {
          OR: [
            { ownerId: userId },
            { memberships: { some: { userId } } },
            {
              wishes: {
                some: {
                  OR: [
                    { authorId: userId },
                    { reservations: { some: { userId } } },
                  ],
                },
              },
            },
          ],
        },
        select: { id: true },
        orderBy: { id: "asc" },
      });
      for (const list of affected) {
        await lockWishlist(tx, list.id);
      }

      const impact = await deletionImpact(tx, userId);
      if (impact.impactToken !== data.impactToken) {
        throw new AuthError(
          "Your lists or reservations changed. Refresh this page and review the updated summary before deleting.",
        );
      }

      for (const list of impact.outcomes) {
        await tx.wishlist.update({
          where: { id: list.id },
          data: list.successor
            ? { ownerId: list.successor.userId }
            : { ownerId: null, archivedAt: new Date() },
        });
      }

      // Previously archived content must not appear in the review page. Detach
      // any retained ownership without changing its original archive date.
      await tx.wishlist.updateMany({
        where: { ownerId: userId, archivedAt: { not: null } },
        data: { ownerId: null },
      });

      // Only the personal avatar is deleted. List/wish images belong to retained
      // content; archived images remain inaccessible under the media access policy.
      await tx.media.updateMany({
        where: { userId },
        data: { userId: null, cleanupAfter: new Date() },
      });
      // Cascades revoke all sessions/tokens/memberships/reservations, while wishes
      // retain their content with a null author. Archiving ends all other reservations.
      await tx.user.delete({ where: { id: userId } });
    },
    { timeout: 15_000 },
  );
};
