"use server";
import {
  type ActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { authActionError } from "@/features/auth/service/action-error";
import { limitAuthRequest } from "@/features/auth/service/request-limit";
import { emailSchema } from "@/features/auth/service/schemas";
import { prisma } from "@/lib/prisma";
import { sendEmailPasswordReset } from "../emails/send-email-password-reset";
import { generatePasswordResetLink } from "../utils/generate-password-reset-link";

export const passwordForgot = async (_state: ActionState, data: FormData) => {
  try {
    const email = emailSchema.parse(data.get("email"));

    await limitAuthRequest("recovery", email, 3);

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      try {
        const url = await generatePasswordResetLink(user.id);
        await sendEmailPasswordReset(user.username, user.email, url);
      } catch {
        console.error("Password recovery email failed");
      }
    }
    return toActionState(
      "SUCCESS",
      "If an account matches that email, you will receive a reset link.",
    );
  } catch (error) {
    return authActionError(error, data);
  }
};
