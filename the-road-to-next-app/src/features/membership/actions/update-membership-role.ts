"use server";

import { revalidatePath } from "next/cache";
import { toActionState } from "@/components/form/utils/to-action-state";
import { MembershipRole } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { membershipsPath } from "@/paths";
import { getAdminOrRedirect } from "../queries/get-admin-or-redirect";
import { getMemberships } from "../queries/get-memberships";

export const updateMembershipRole = async ({
  organizationId,
  userId,
  membershipRole,
}: {
  organizationId: string;
  userId: string;
  membershipRole: MembershipRole;
}) => {
  await getAdminOrRedirect(organizationId);

  const memberships = await getMemberships(organizationId);

  const targetMembership = (memberships ?? []).find(
    (membership) => membership.userId === userId,
  );

  if (!targetMembership) {
    return toActionState("ERROR", "Membership not found");
  }

  const adminMemberships = (memberships ?? []).filter(
    (membership) => membership.membershipRole === "ADMIN",
  );

  const updatesAdmin = targetMembership.membershipRole === "ADMIN";
  const isLastAdmin = adminMemberships.length <= 1;

  if (updatesAdmin && isLastAdmin) {
    return toActionState(
      "ERROR",
      "Cannot change last admin membership to a non-admin role",
    );
  }

  await prisma.membership.update({
    where: {
      membershipId: {
        userId,
        organizationId,
      },
    },
    data: {
      membershipRole,
    },
  });

  revalidatePath(membershipsPath(organizationId));

  return toActionState("SUCCESS", "The role has been updated successfully");
};
