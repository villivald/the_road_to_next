"use server";

import { revalidatePath } from "next/cache";
import {
  ActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { prisma } from "@/lib/prisma";
import { membershipsPath } from "@/paths";
import { getAdminOrRedirect } from "../queries/get-admin-or-redirect";

export const togglePermission = async (
  _actionState: ActionState,
  formData: FormData,
) => {
  const userId = formData.get("userId")?.toString() ?? "";
  const organizationId = formData.get("organizationId")?.toString() ?? "";
  const permissionKey = formData.get("permissionKey");
  await getAdminOrRedirect(organizationId);

  if (permissionKey !== "canDeleteTicket") {
    return toActionState("ERROR", "Invalid permission");
  }

  const where = {
    membershipId: {
      userId,
      organizationId,
    },
  };

  const membership = await prisma.membership.findUnique({
    where,
  });

  if (!membership) {
    return toActionState("ERROR", "Membership not found");
  }

  await prisma.membership.update({
    where,
    data: {
      [permissionKey]: membership[permissionKey] === true ? false : true,
    },
  });

  revalidatePath(membershipsPath(organizationId));

  return toActionState("SUCCESS", "Permission updated");
};
