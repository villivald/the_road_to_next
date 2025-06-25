"use server";

import { z } from "zod";
import {
  ActionState,
  fromErrorToActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { inngest } from "@/lib/inngest";
import { verifyPasswordHash } from "../utils/hash-and-verify";

const passwordChangeSchema = z.object({
  password: z.string().min(6).max(191),
});

export const passwordChange = async (
  _actionState: ActionState,
  formData: FormData,
) => {
  const auth = await getAuthOrRedirect();

  try {
    const { password } = passwordChangeSchema.parse({
      password: formData.get("password"),
    });

    const validPassword = await verifyPasswordHash(
      auth.user.passwordHash,
      password,
    );

    if (!validPassword) {
      return toActionState("ERROR", "Incorrect password", formData);
    }

    await inngest.send({
      name: "app/password.password-reset",
      data: { userId: auth.user.id },
    });
  } catch (error) {
    return fromErrorToActionState(error, formData);
  }

  return toActionState("SUCCESS", "Check your email for the reset link");
};
