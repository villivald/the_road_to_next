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
import { PremiumError } from "@/features/premium/service/entitlements";
import { SharingError } from "@/features/sharing/service/access";
import { guestLinksPath } from "@/paths";
import { getBaseUrl } from "@/utils/url";
import { createGuestLink, revokeGuestLink } from "../service/links";

const actionError = (error: unknown, data?: FormData) =>
  error instanceof SharingError || error instanceof PremiumError
    ? toActionState("ERROR", error.message, data)
    : authActionError(error, data);

export const createLink = async (
  listId: string,
  _state: ActionState,
  data: FormData,
) => {
  const { user, session } = await getAuthOrRedirect();
  try {
    await limitSourceRequest("guest-link-create");
    z.literal("yes", {
      error:
        "Confirm that anyone with this link may view the list when it is visible.",
    }).parse(data.get("confirm"));
    const { token } = await createGuestLink(user.id, session.id, listId, {
      label: data.get("label"),
      days: data.get("days"),
    });
    revalidatePath(guestLinksPath(listId));
    // Show once; no raw token is persisted, logged, or included in a URL path/query.
    return toActionState(
      "SUCCESS",
      "Guest link created. Copy it now; it will not be shown again.",
      undefined,
      { url: `${getBaseUrl()}/guest#${token}` },
    );
  } catch (error) {
    return actionError(error, data);
  }
};

export const revokeLink = async (
  listId: string,
  id: string,
  _state: ActionState,
  _data: FormData,
) => {
  const { user, session } = await getAuthOrRedirect();
  try {
    await limitSourceRequest("guest-link-revoke");
    await revokeGuestLink(user.id, session.id, listId, id);
  } catch (error) {
    return actionError(error);
  }
  revalidatePath(guestLinksPath(listId));
  redirect(`${guestLinksPath(listId)}?revoked=1`);
};
