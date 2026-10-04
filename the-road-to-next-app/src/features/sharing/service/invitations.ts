import { consumeRateLimit } from "@/features/auth/service/security";
import {
  readPremiumAccess,
  requirePremium,
} from "@/features/premium/service/entitlements";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { lockSharing, requireAdmin, SharingError } from "./access";
import { invitationSchema } from "./schemas";

const unavailable =
  "This invitation is unavailable. Sign in with the invited email or ask the list admin for a new invitation.";

export const activeInvitation = (
  now = new Date(),
): Prisma.InvitationWhereInput => ({
  acceptedAt: null,
  revokedAt: null,
  expiresAt: { gt: now },
  wishlist: { archivedAt: null },
});

export const inviteMember = async (
  userId: string,
  sessionId: string,
  listId: string,
  input: unknown,
) => {
  const data = invitationSchema.parse(input);
  await consumeRateLimit("invite-create", userId, 20, 60 * 60 * 1000);
  return prisma.$transaction(async (tx) => {
    const { list, role } = await lockSharing(tx, userId, sessionId, listId);
    requireAdmin(role);
    await requirePremium(list.ownerId!, tx);
    const member = await tx.membership.findFirst({
      where: { wishlistId: listId, user: { email: data.email } },
      select: { id: true },
    });
    if (member) {
      throw new SharingError("This person already belongs to this list.");
    }
    const previous = await tx.invitation.findFirst({
      where: {
        wishlistId: listId,
        email: data.email,
        acceptedAt: null,
        revokedAt: null,
      },
    });
    if (previous && previous.expiresAt > new Date()) {
      if (previous.role !== data.role || previous.deliveryFailedAt) {
        throw new SharingError(
          "Revoke the pending invitation before creating a replacement.",
        );
      }
      return { id: previous.id };
    }
    if (previous) {
      await tx.invitation.update({
        where: { id: previous.id },
        data: { revokedAt: new Date() },
      });
    }
    await consumeRateLimit("invite-recipient", data.email, 5, 60 * 60 * 1000);
    return tx.invitation.create({
      data: {
        ...data,
        wishlistId: listId,
        inviterId: userId,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
      select: { id: true },
    });
  });
};

export const revokeInvitation = async (
  userId: string,
  sessionId: string,
  listId: string,
  invitationId: string,
) => {
  await prisma.$transaction(async (tx) => {
    const { role } = await lockSharing(tx, userId, sessionId, listId);
    requireAdmin(role);
    await tx.invitation.updateMany({
      where: {
        id: invitationId,
        wishlistId: listId,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  });
};

export const readInvitation = async (id: string, userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, emailVerified: true },
    select: { email: true },
  });
  if (!user) return null;
  const invitation = await prisma.invitation.findFirst({
    where: { id, email: user.email, ...activeInvitation() },
    select: {
      id: true,
      role: true,
      expiresAt: true,
      inviterId: true,
      wishlistId: true,
      wishlist: { select: { ownerId: true } },
    },
  });
  if (!invitation) return null;
  const inviter = await prisma.membership.findFirst({
    where: {
      wishlistId: invitation.wishlistId,
      userId: invitation.inviterId,
      role: "ADMIN",
      user: { emailVerified: true },
    },
    select: { user: { select: { username: true } } },
  });
  if (!inviter) return null;
  const access = await readPremiumAccess(invitation.wishlist.ownerId!);
  return {
    id: invitation.id,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    canAccept: access.plan === "PREMIUM",
    invitedBy: inviter.user.username,
  };
};

export const acceptInvitation = async (
  userId: string,
  sessionId: string,
  invitationId: string,
) => {
  await consumeRateLimit("invite-accept", userId, 20, 15 * 60 * 1000);
  const locator = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: { wishlistId: true },
  });
  if (!locator) throw new SharingError(unavailable);
  return prisma.$transaction(async (tx) => {
    const { user, list } = await lockSharing(
      tx,
      userId,
      sessionId,
      locator.wishlistId,
    );
    const invitation = await tx.invitation.findFirst({
      where: { id: invitationId, email: user.email, ...activeInvitation() },
    });
    if (!invitation) throw new SharingError(unavailable);
    const inviter = await tx.membership.findFirst({
      where: {
        wishlistId: list.id,
        userId: invitation.inviterId,
        role: "ADMIN",
        user: { emailVerified: true },
      },
      select: { id: true },
    });
    if (!inviter) throw new SharingError(unavailable);
    await requirePremium(list.ownerId!, tx);
    // Never promote an existing member through an old invitation.
    await tx.membership.upsert({
      where: { wishlistId_userId: { wishlistId: list.id, userId } },
      create: { wishlistId: list.id, userId, role: invitation.role },
      update: {},
    });
    await tx.invitation.update({
      where: { id: invitationId },
      data: { acceptedAt: new Date() },
    });
    return { listId: list.id };
  });
};
