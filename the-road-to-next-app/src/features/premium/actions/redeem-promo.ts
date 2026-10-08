"use server";

import {
  type ActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { authActionError } from "@/features/auth/service/action-error";
import { limitSourceRequest } from "@/features/auth/service/request-limit";
import { revalidatePath } from "@/i18n/server-navigation";
import { accountPlanPath, accountProfilePath } from "@/paths";
import { PremiumError } from "../service/entitlements";
import { redeemPromo } from "../service/promotions";

export const redeemPromoCode = async (_state: ActionState, data: FormData) => {
  const { user, session } = await getAuthOrRedirect();

  try {
    await limitSourceRequest("promo-redeem");
    await redeemPromo(user.id, session.id, data.get("code"));
  } catch (error) {
    if (error instanceof PremiumError) {
      return toActionState("ERROR", error.message);
    }
    // Never return the submitted code in action payloads or log it.
    return authActionError(error);
  }

  revalidatePath(accountPlanPath);
  revalidatePath(accountProfilePath);
  return toActionState(
    "SUCCESS",
    "Promo code redeemed. Your Premium access has been updated.",
  );
};
