"use server";
import {
  type ActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { sendEmailVerification } from "../emails/send-email-verification";
import { getAuthOrRedirect } from "../queries/get-auth-or-redirect";
import { authActionError } from "../service/action-error";
import { limitAuthRequest } from "../service/request-limit";
import { generateEmailVerificationCode } from "../utils/generate-email-verification-code";

export const emailVerificationResend = async (
  _state: ActionState,
  _data: FormData,
) => {
  const { user } = await getAuthOrRedirect({ checkEmailVerified: false });

  if (user.emailVerified) {
    return toActionState("SUCCESS", "Your email is already verified.");
  }
  try {
    await limitAuthRequest("verification-resend", user.id, 3, 60_000);
    const code = await generateEmailVerificationCode(user.id, user.email);
    await sendEmailVerification(user.username, user.email, code);
    return toActionState(
      "SUCCESS",
      "A new code has been sent. Check your inbox.",
    );
  } catch (error) {
    return authActionError(error);
  }
};
