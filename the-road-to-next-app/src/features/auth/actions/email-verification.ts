"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/form/utils/to-action-state";
import { getAuthOrRedirect } from "../queries/get-auth-or-redirect";
import { verifyEmail } from "../service/accounts";
import { authActionError } from "../service/action-error";
import { limitAuthRequest } from "../service/request-limit";
import { safeReturnTo } from "../utils/return-to";
import { setSessionCookie } from "../utils/session-cookie";

export const emailVerification = async (
  _state: ActionState,
  data: FormData,
) => {
  const returnTo = safeReturnTo(data.get("returnTo"));
  const { user } = await getAuthOrRedirect({
    checkEmailVerified: false,
    returnTo,
  });

  if (user.emailVerified) {
    redirect(returnTo);
  }
  try {
    await limitAuthRequest("verification", user.id);
    const code = z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{8}$/, "Enter the eight-letter code")
      .parse(data.get("code"));
    const result = await verifyEmail(user.id, user.email, code);
    await setSessionCookie(result.token, result.session.expiresAt);
  } catch (error) {
    return authActionError(error, data);
  }
  redirect(returnTo);
};
