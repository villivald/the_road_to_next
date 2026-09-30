"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/form/utils/to-action-state";
import { resetPassword } from "@/features/auth/service/accounts";
import { authActionError } from "@/features/auth/service/action-error";
import { limitAuthRequest } from "@/features/auth/service/request-limit";
import { newPasswordSchema } from "@/features/auth/service/schemas";
import { deleteSessionCookie } from "@/features/auth/utils/session-cookie";
import { signInPath } from "@/paths";

export const passwordReset = async (_state: ActionState, data: FormData) => {
  try {
    const token = z
      .string()
      .regex(/^[a-z2-7]{32}$/)
      .parse(data.get("tokenId"));
    await limitAuthRequest("reset", token, 5);
    const input = newPasswordSchema.parse(Object.fromEntries(data));
    await resetPassword(token, input.password);
    await deleteSessionCookie();
  } catch (error) {
    return authActionError(error, data);
  }
  redirect(`${signInPath}?reset=success`);
};
