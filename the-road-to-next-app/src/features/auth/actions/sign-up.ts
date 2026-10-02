"use server";

import { redirect } from "next/navigation";
import {
  type ActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { Prisma } from "@/generated/prisma/client";
import { emailVerificationPath } from "@/paths";
import { sendEmailVerification } from "../emails/send-email-verification";
import { register } from "../service/accounts";
import { authActionError } from "../service/action-error";
import { limitAuthRequest } from "../service/request-limit";
import { signUpSchema } from "../service/schemas";
import { generateEmailVerificationCode } from "../utils/generate-email-verification-code";
import { authReturnPath } from "../utils/return-to";
import { setSessionCookie } from "../utils/session-cookie";

export const signUp = async (_state: ActionState, data: FormData) => {
  try {
    const input = signUpSchema.parse(Object.fromEntries(data));

    await limitAuthRequest("sign-up", input.email, 5);

    const result = await register(input);

    await setSessionCookie(result.token, result.session.expiresAt);
    try {
      const code = await generateEmailVerificationCode(
        result.user.id,
        result.user.email,
      );
      await sendEmailVerification(
        result.user.username,
        result.user.email,
        code,
      );
    } catch {
      // Account and session remain usable; the verification page offers resend.
      console.error("Initial verification email failed; resend is available");
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return toActionState(
        "ERROR",
        "Unable to register with these details. Try signing in or recovering your password.",
        data,
      );
    }

    return authActionError(error, data);
  }

  redirect(authReturnPath(emailVerificationPath, data.get("returnTo")));
};
