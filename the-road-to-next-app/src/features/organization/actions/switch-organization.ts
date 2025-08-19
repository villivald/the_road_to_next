"use server";

import { revalidatePath } from "next/cache";
import {
  fromErrorToActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { prisma } from "@/lib/prisma";
import { organizationsPath } from "@/paths";
import { getOrganizationsByUser } from "../queries/get-organizations-by-user";

export const switchOrganization = async (organizationId: string) => {
  const { user } = await getAuthOrRedirect({
    checkActiveOrganization: false,
  });

  try {
    const organization = await getOrganizationsByUser();

    const canSwitch = organization.some((org) => org.id === organizationId);

    if (!canSwitch) {
      return toActionState(
        "ERROR",
        "You cannot switch to an organization you are not a member of.",
      );
    }

    await prisma.$transaction([
      prisma.membership.update({
        where: {
          membershipId: {
            organizationId,
            userId: user.id,
          },
        },
        data: {
          isActive: true,
        },
      }),

      prisma.membership.updateMany({
        where: {
          userId: user.id,
          organizationId: {
            not: organizationId,
          },
        },
        data: {
          isActive: false,
        },
      }),
    ]);
  } catch (error) {
    return fromErrorToActionState(error);
  }

  revalidatePath(organizationsPath);

  return toActionState("SUCCESS", "Active organization switched successfully");
};
