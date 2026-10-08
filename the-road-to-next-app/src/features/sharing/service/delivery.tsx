import InvitationEmail from "@/emails/sharing/invitation";
import { readPremiumAccess } from "@/features/premium/service/entitlements";
import { localizedPath } from "@/i18n/config";
import { createText } from "@/i18n/text";
import { deliverEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { invitationPath } from "@/paths";
import { generateRandomToken } from "@/utils/crypto";
import { getBaseUrl } from "@/utils/url";
import { activeInvitation } from "./invitations";

// Durable delivery intent is created in the invitation transaction. Claims expire
// after two minutes; retries reuse the same provider key and immutable message.
export const deliverInvitations = async (id?: string) => {
  const pending = await prisma.invitation.findMany({
    where: {
      id,
      ...activeInvitation(),
      sentAt: null,
      deliveryFailedAt: null,
      nextAttemptAt: { lte: new Date() },
    },
    orderBy: [{ nextAttemptAt: "asc" }, { id: "asc" }],
    take: 10,
    select: { id: true },
  });
  let sent = 0;
  let failed = 0;

  for (const item of pending) {
    const claimId = generateRandomToken();
    const claimed = await prisma.invitation.updateMany({
      where: {
        id: item.id,
        ...activeInvitation(),
        sentAt: null,
        deliveryFailedAt: null,
        nextAttemptAt: { lte: new Date() },
      },
      data: { claimId, nextAttemptAt: new Date(Date.now() + 120000) },
    });
    if (!claimed.count) continue;

    const invitation = await prisma.invitation.findUnique({
      where: { id: item.id },
      include: { wishlist: { select: { ownerId: true, archivedAt: true } } },
    });
    if (!invitation) continue;
    const claimedWhere = { id: item.id, claimId };
    // Resend remembers keys for 24 hours. Stop before that boundary rather than
    // risk an ambiguous old send becoming a fresh delivery on a later retry.
    if (
      invitation.deliveryAttempts >= 8 ||
      (invitation.firstAttemptAt &&
        Date.now() - invitation.firstAttemptAt.getTime() >= 23 * 3600000)
    ) {
      await prisma.invitation.updateMany({
        where: claimedWhere,
        data: { deliveryFailedAt: new Date(), claimId: null },
      });
      failed++;
      continue;
    }

    const inviter = await prisma.membership.count({
      where: {
        wishlistId: invitation.wishlistId,
        userId: invitation.inviterId,
        role: "ADMIN",
        user: { emailVerified: true },
      },
    });
    if (
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt <= new Date() ||
      invitation.wishlist.archivedAt ||
      !inviter
    ) {
      await prisma.invitation.updateMany({
        where: claimedWhere,
        data: { claimId: null, ...(!inviter ? { revokedAt: new Date() } : {}) },
      });
      continue;
    }
    if (
      (await readPremiumAccess(invitation.wishlist.ownerId!)).plan !== "PREMIUM"
    ) {
      await prisma.invitation.updateMany({
        where: claimedWhere,
        data: { claimId: null, nextAttemptAt: new Date(Date.now() + 3600000) },
      });
      continue;
    }

    const attempt = invitation.deliveryAttempts + 1;
    const ready = await prisma.invitation.updateMany({
      where: {
        ...claimedWhere,
        ...activeInvitation(),
        nextAttemptAt: { gt: new Date() },
      },
      data: {
        firstAttemptAt: invitation.firstAttemptAt ?? new Date(),
        deliveryAttempts: { increment: 1 },
      },
    });
    if (!ready.count) continue;
    try {
      await deliverEmail(
        invitation.email,
        createText(invitation.locale)("Your Wishlist invitation"),
        <InvitationEmail
          locale={invitation.locale}
          url={`${getBaseUrl()}${localizedPath(invitationPath(invitation.id), invitation.locale)}`}
        />,
        `wishlist-invitation/${invitation.id}`,
      );
      await prisma.invitation.updateMany({
        where: claimedWhere,
        data: { sentAt: new Date(), claimId: null },
      });
      sent++;
    } catch {
      await prisma.invitation.updateMany({
        where: claimedWhere,
        data: {
          claimId: null,
          nextAttemptAt: new Date(
            Date.now() + Math.min(60, 2 ** attempt) * 60000,
          ),
          ...(attempt >= 8 ? { deliveryFailedAt: new Date() } : {}),
        },
      });
      failed++;
    }
  }
  return { sent, failed };
};
