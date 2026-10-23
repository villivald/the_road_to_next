"use server";
import {
  type ActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { authActionError } from "@/features/auth/service/action-error";
import { verifyAccountChallenge } from "@/features/auth/service/bot-protection";
import { requestPasswordRecovery } from "@/features/auth/service/email-requests";
import {
  limitAccountEmailSource,
  limitAuthRequest,
} from "@/features/auth/service/request-limit";
import { emailSchema } from "@/features/auth/service/schemas";

export const passwordForgot = async (_state: ActionState, data: FormData) => {
  try {
    const email = emailSchema.parse(data.get("email"));
    await verifyAccountChallenge(data, "password_recovery");
    await limitAccountEmailSource();
    await limitAuthRequest("recovery", email, 3);

    try {
      await requestPasswordRecovery(email);
    } catch {
      console.error("Password recovery email failed");
    }
    return toActionState(
      "SUCCESS",
      "If an account matches that email, you will receive a reset link.",
    );
  } catch (error) {
    return authActionError(error, data);
  }
};
