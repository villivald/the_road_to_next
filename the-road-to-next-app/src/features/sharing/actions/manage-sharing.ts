"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  type ActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { authActionError } from "@/features/auth/service/action-error";
import { limitSourceRequest } from "@/features/auth/service/request-limit";
import { consumeRateLimit } from "@/features/auth/service/security";
import { PremiumError } from "@/features/premium/service/entitlements";
import {
  browsePath,
  invitationPath,
  listsPath,
  reservationsPath,
  sharedListsPath,
  sharingPath,
} from "@/paths";
import { SharingError } from "../service/access";
import { deliverInvitations } from "../service/delivery";
import {
  acceptInvitation,
  inviteMember,
  revokeInvitation,
} from "../service/invitations";
import {
  changeMemberRole,
  removeMember,
  setVisibility,
  transferOwnership,
} from "../service/members";

const refresh = (listId: string) => {
  for (const path of [
    listsPath,
    sharedListsPath,
    browsePath,
    reservationsPath,
    sharingPath(listId),
  ])
    revalidatePath(path);
  revalidatePath("/lists/[listId]", "layout");
};

const actionError = (error: unknown, data?: FormData) =>
  error instanceof SharingError || error instanceof PremiumError
    ? toActionState("ERROR", error.message, data)
    : authActionError(error, data);

const limit = async (userId: string) => {
  await limitSourceRequest("sharing");
  await consumeRateLimit("sharing", userId, 60, 15 * 60 * 1000);
};

const confirm = (data: FormData) =>
  z
    .literal("yes", { error: "Confirm this change before continuing." })
    .parse(data.get("confirm"));

export const sendInvitation = async (
  listId: string,
  _state: ActionState,
  data: FormData,
) => {
  const { user, session } = await getAuthOrRedirect();
  let id: string;
  try {
    await limit(user.id);
    ({ id } = await inviteMember(user.id, session.id, listId, {
      email: data.get("email"),
      role: data.get("role"),
    }));
  } catch (error) {
    return actionError(error, data);
  }
  // A failed send leaves durable work for the scheduled worker, never loses the invitation.
  try {
    await deliverInvitations(id);
  } catch {
    console.error("Invitation delivery queued for retry");
  }
  refresh(listId);
  return toActionState(
    "SUCCESS",
    "Invitation created. Delivery status is shown below.",
  );
};

export const cancelInvitation = async (
  listId: string,
  id: string,
  _state: ActionState,
  _data: FormData,
) => {
  const { user, session } = await getAuthOrRedirect();
  try {
    await limit(user.id);
    await revokeInvitation(user.id, session.id, listId, id);
  } catch (error) {
    return actionError(error);
  }
  refresh(listId);
  redirect(`${sharingPath(listId)}?changed=revoked`);
};

export const joinList = async (
  id: string,
  _state: ActionState,
  data: FormData,
) => {
  const { user, session } = await getAuthOrRedirect({
    returnTo: invitationPath(id),
  });
  let listId: string;
  try {
    await limit(user.id);
    confirm(data);
    ({ listId } = await acceptInvitation(user.id, session.id, id));
  } catch (error) {
    return actionError(error);
  }
  refresh(listId);
  revalidatePath(invitationPath(id));
  redirect(`${sharedListsPath}?joined=1`);
};

export const changeVisibility = async (
  listId: string,
  _state: ActionState,
  data: FormData,
) => {
  const { user, session } = await getAuthOrRedirect();
  try {
    await limit(user.id);
    confirm(data);
    await setVisibility(user.id, session.id, listId, data.get("visibility"));
  } catch (error) {
    return actionError(error);
  }
  refresh(listId);
  return toActionState(
    "SUCCESS",
    "Visibility updated. Reservations for people who lost access have ended.",
  );
};

export const updateMemberRole = async (
  listId: string,
  id: string,
  _state: ActionState,
  data: FormData,
) => {
  const { user, session } = await getAuthOrRedirect();
  let leftManagement = false;
  try {
    await limit(user.id);
    confirm(data);
    ({ leftManagement } = await changeMemberRole(
      user.id,
      session.id,
      listId,
      id,
      data.get("role"),
    ));
  } catch (error) {
    return actionError(error);
  }
  refresh(listId);
  if (leftManagement) redirect(`${sharedListsPath}?roleChanged=1`);
  return toActionState("SUCCESS", "Role updated.");
};

export const deleteMembership = async (
  listId: string,
  id: string,
  _state: ActionState,
  data: FormData,
) => {
  const { user, session } = await getAuthOrRedirect();
  let left = false;
  try {
    await limit(user.id);
    confirm(data);
    ({ left } = await removeMember(user.id, session.id, listId, id));
  } catch (error) {
    return actionError(error);
  }
  refresh(listId);
  if (left) redirect(`${sharedListsPath}?left=1`);
  redirect(`${sharingPath(listId)}?changed=removed`);
};

export const transferList = async (
  listId: string,
  id: string,
  _state: ActionState,
  data: FormData,
) => {
  const { user, session } = await getAuthOrRedirect();
  try {
    await limit(user.id);
    confirm(data);
    await transferOwnership(user.id, session.id, listId, id);
  } catch (error) {
    return actionError(error);
  }
  refresh(listId);
  redirect(`${sharingPath(listId)}?changed=transferred`);
};
