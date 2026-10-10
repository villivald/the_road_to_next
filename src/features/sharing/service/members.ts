import { consumeRateLimit } from "@/features/auth/service/security";
import { requirePremium } from "@/features/premium/service/entitlements";
import { prisma } from "@/lib/prisma";
import { lockSharing, requireAdmin, SharingError } from "./access";
import { roleSchema, visibilitySchema } from "./schemas";

export const setVisibility = async (
  userId: string,
  sessionId: string,
  listId: string,
  input: unknown,
) => {
  const visibility = visibilitySchema.parse(input);
  await prisma.$transaction(async (tx) => {
    const { list, role } = await lockSharing(tx, userId, sessionId, listId);
    requireAdmin(role);
    if (visibility === "PRIVATE" && list.visibility !== "PRIVATE") {
      await requirePremium(list.ownerId!, tx);
    }
    // Database lifecycle triggers end reservations only for people losing access.
    await tx.wishlist.update({ where: { id: listId }, data: { visibility } });
  });
};

export const changeMemberRole = async (
  userId: string,
  sessionId: string,
  listId: string,
  membershipId: string,
  input: unknown,
) => {
  const targetRole = roleSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const { list, role } = await lockSharing(tx, userId, sessionId, listId);
    requireAdmin(role);
    const member = await tx.membership.findFirst({
      where: { id: membershipId, wishlistId: listId },
    });
    if (!member || member.userId === list.ownerId) {
      throw new SharingError(
        "The owner's admin role cannot be changed. Transfer ownership first.",
      );
    }
    if (targetRole === "ADMIN" && member.role !== "ADMIN") {
      await requirePremium(list.ownerId!, tx);
    }
    await tx.membership.update({
      where: { id: member.id },
      data: { role: targetRole },
    });
    if (targetRole === "MEMBER") {
      await tx.invitation.updateMany({
        where: {
          wishlistId: listId,
          inviterId: member.userId,
          acceptedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }
    return {
      leftManagement: member.userId === userId && targetRole === "MEMBER",
    };
  });
};

export const removeMember = async (
  userId: string,
  sessionId: string,
  listId: string,
  membershipId: string,
) => {
  return prisma.$transaction(async (tx) => {
    const { list, role } = await lockSharing(tx, userId, sessionId, listId);
    const member = await tx.membership.findFirst({
      where: { id: membershipId, wishlistId: listId },
    });
    if (!member || (role !== "ADMIN" && member.userId !== userId)) {
      throw new SharingError("This membership is unavailable.");
    }
    if (member.userId === list.ownerId) {
      throw new SharingError(
        "The owner cannot leave or be removed. Transfer ownership first.",
      );
    }
    await tx.invitation.updateMany({
      where: {
        wishlistId: listId,
        inviterId: member.userId,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    await tx.membership.delete({ where: { id: member.id } });
    return { left: member.userId === userId };
  });
};

export const transferOwnership = async (
  userId: string,
  sessionId: string,
  listId: string,
  membershipId: string,
) => {
  await consumeRateLimit("ownership-transfer", userId, 20, 60 * 60 * 1000);
  await prisma.$transaction(async (tx) => {
    const { list, role } = await lockSharing(tx, userId, sessionId, listId);
    requireAdmin(role);
    if (list.ownerId !== userId) {
      throw new SharingError("Only the owner can transfer this list.");
    }
    const member = await tx.membership.findFirst({
      where: {
        id: membershipId,
        wishlistId: listId,
        role: "ADMIN",
        userId: { not: userId },
        user: { emailVerified: true },
      },
    });
    if (!member) {
      throw new SharingError("Choose another current admin as the new owner.");
    }
    await tx.wishlist.update({
      where: { id: listId },
      data: { ownerId: member.userId },
    });
  });
};
