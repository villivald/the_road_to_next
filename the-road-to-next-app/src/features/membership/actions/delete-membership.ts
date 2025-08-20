"use server";

import { toActionState } from "@/components/form/utils/to-action-state";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { prisma } from "@/lib/prisma";
import { getMemberships } from "../queries/get-memberships";

export const deleteMembership = async (
  organizationId: string,
  userId: string,
) => {
  await getAuthOrRedirect();

  const memberships = await getMemberships(organizationId);

  const isLastMembership = (memberships ?? []).length === 1;

  if (isLastMembership) {
    return toActionState(
      "ERROR",
      "Cannot delete last membership of an organization",
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

  return toActionState("SUCCESS", "Membership deleted successfully");
};
