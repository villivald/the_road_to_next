"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/components/form/utils/to-action-state";
import { emailVerificationPath } from "@/paths";
import { authenticate } from "../service/accounts";
import { authActionError } from "../service/action-error";
import { limitAuthRequest } from "../service/request-limit";
import { signInSchema } from "../service/schemas";
import { authReturnPath, safeReturnTo } from "../utils/return-to";
import { setSessionCookie } from "../utils/session-cookie";

export const signIn = async (_state: ActionState, data: FormData) => {
  let verified = false;

  try {
    const input = signInSchema.parse(Object.fromEntries(data));

    await limitAuthRequest("sign-in", input.email);

    const result = await authenticate(input.email, input.password);
    await setSessionCookie(result.token, result.session.expiresAt);
    verified = result.user.emailVerified;
  } catch (error) {
    return authActionError(error, data);
  }
  redirect(
    verified
      ? safeReturnTo(data.get("returnTo"))
      : authReturnPath(emailVerificationPath, data.get("returnTo")),
  );
};
