"use server";

import { z } from "zod";
import {
  type ActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { changePassword } from "@/features/auth/service/accounts";
import { authActionError } from "@/features/auth/service/action-error";
import { limitAuthRequest } from "@/features/auth/service/request-limit";
import { newPasswordSchema } from "@/features/auth/service/schemas";
import { setSessionCookie } from "@/features/auth/utils/session-cookie";

export const passwordChange = async (_state: ActionState, data: FormData) => {
  const { user } = await getAuthOrRedirect();

  try {
    await limitAuthRequest("password-change", user.id, 5);

    const input = newPasswordSchema
      .safeExtend({ currentPassword: z.string().min(1).max(128) })
      .parse(Object.fromEntries(data));
    const result = await changePassword(
      user.id,
      input.currentPassword,
      input.password,
    );
    await setSessionCookie(result.token, result.session.expiresAt);
    return toActionState(
      "SUCCESS",
      "Password changed. Your other sessions have been signed out.",
    );
  } catch (error) {
    return authActionError(error, data);
  }
};
