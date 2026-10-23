"use server";
import {
  type ActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { getAuthOrRedirect } from "../queries/get-auth-or-redirect";
import { authActionError } from "../service/action-error";
import { verifyAccountChallenge } from "../service/bot-protection";
import { requestVerificationEmail } from "../service/email-requests";
import {
  limitAccountEmailSource,
  limitAuthRequest,
} from "../service/request-limit";

export const emailVerificationResend = async (
  _state: ActionState,
  data: FormData,
) => {
  const { user } = await getAuthOrRedirect({ checkEmailVerified: false });

  if (user.emailVerified) {
    return toActionState("SUCCESS", "Your email is already verified.");
  }
  try {
    await verifyAccountChallenge(data, "verification_resend");
    await limitAccountEmailSource();
    await limitAuthRequest("verification-resend", user.id, 3, 60_000);
    if (!(await requestVerificationEmail(user))) {
      return toActionState(
        "ERROR",
        "Please wait before requesting another email. Check your inbox and spam folder.",
      );
    }
    return toActionState(
      "SUCCESS",
      "A new code has been sent. Check your inbox.",
    );
  } catch (error) {
    return authActionError(error);
  }
};
