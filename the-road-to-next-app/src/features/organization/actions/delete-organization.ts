"use server";

import {
  fromErrorToActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { prisma } from "@/lib/prisma";
import { getOrganizationsByUser } from "../queries/get-organizations-by-user";

export const deleteOrganization = async (organizationId: string) => {
  await getAuthOrRedirect();

  try {
    const organization = await getOrganizationsByUser();

    const canDelete = organization.some((org) => org.id === organizationId);

    if (!canDelete) {
      return toActionState(
        "ERROR",
        "You cannot delete to an organization you are not a member of.",
      );
    }

    await prisma.organization.delete({
      where: {
        id: organizationId,
      },
    });
  } catch (error) {
    return fromErrorToActionState(error);
  }

  return toActionState("SUCCESS", "Organization deleted successfully");
};
