"use server";

import { toActionState } from "@/components/form/utils/to-action-state";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { prisma } from "@/lib/prisma";
import { getMemberships } from "../queries/get-memberships";

export const deleteMembership = async (
  organizationId: string,
  userId: string,
) => {
  const { user } = await getAuthOrRedirect();

  const memberships = await getMemberships(organizationId);

  const isLastMembership = (memberships ?? []).length === 1;

  if (isLastMembership) {
    return toActionState(
      "ERROR",
      "Cannot delete last membership of an organization",
    );
  }

  const targetMembership = (memberships ?? []).find(
    (membership) => membership.userId === userId,
  );

  if (!targetMembership) {
    return toActionState("ERROR", "Membership not found");
  }

  const adminMemberships = (memberships ?? []).filter(
    (membership) => membership.membershipRole === "ADMIN",
  );

  const removesAdmin = targetMembership.membershipRole === "ADMIN";
  const isLastAdmin = adminMemberships.length <= 1;

  if (removesAdmin && isLastAdmin) {
    return toActionState("ERROR", "Cannot delete last admin membership");
  }

  const myMembership = (memberships ?? []).find(
    (membership) => membership.userId === user?.id,
  );

  const isMyself = myMembership?.userId === userId;
  const isAdmin = myMembership?.membershipRole === "ADMIN";

  if (!isAdmin && !isMyself) {
    return toActionState(
      "ERROR",
      "You are not authorized to delete this membership",
    );
  }

  await prisma.membership.delete({
    where: {
      membershipId: {
        organizationId,
        userId,
      },
    },
  });

  return toActionState(
    "SUCCESS",
    isMyself
      ? "You have left the organization"
      : "Membership deleted successfully",
  );
};
