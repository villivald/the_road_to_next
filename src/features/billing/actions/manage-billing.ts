"use server";

import {
  type ActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { authActionError } from "@/features/auth/service/action-error";
import { limitSourceRequest } from "@/features/auth/service/request-limit";
import { consumeRateLimit } from "@/features/auth/service/security";
import { redirect, revalidatePath } from "@/i18n/server-navigation";
import { prisma } from "@/lib/prisma";
import { requireBillingUser } from "../service/accounts";
import {
  discardCheckout,
  portalLink,
  startCheckout,
} from "../service/checkout";
import { syncBillingAccount } from "../service/sync";

export const subscribe = async (
  interval: string,
  _state: ActionState,
  data: FormData,
) => {
  const { user, session } = await getAuthOrRedirect();
  let checkoutId: string;
  try {
    await limitSourceRequest("billing-checkout");
    if (data.get("confirm") !== "yes")
      return toActionState(
        "ERROR",
        "Confirm the recurring subscription terms.",
      );
    checkoutId = await startCheckout(user.id, session.id, interval);
  } catch (error) {
    return authActionError(error);
  }
  return await redirect(
    `/account/checkout?id=${encodeURIComponent(checkoutId)}`,
  );
};

export const manageSubscription = async (
  id: string,
  _state: ActionState,
  _data: FormData,
) => {
  const { user, session } = await getAuthOrRedirect();
  let url: string;
  try {
    await limitSourceRequest("billing-portal");
    await consumeRateLimit("billing-portal", user.id, 20, 3600000);
    url = await portalLink(user.id, session.id, id);
  } catch (error) {
    return authActionError(error);
  }
  return await redirect(url);
};

export const refreshBilling = async (_state: ActionState, _data: FormData) => {
  const { user, session } = await getAuthOrRedirect();
  try {
    await limitSourceRequest("billing-refresh");
    await consumeRateLimit("billing-refresh", user.id, 30, 3600000);
    const account = await prisma.$transaction(async (tx) => {
      await requireBillingUser(tx, user.id, session.id);
      return tx.billingAccount.findUnique({ where: { userId: user.id } });
    });
    if (account && !(await syncBillingAccount(account.id))) {
      const current = await prisma.billingAccount.findUnique({
        where: { id: account.id },
      });
      if (current?.leaseUntil && current.leaseUntil > new Date()) {
        return toActionState(
          "PENDING",
          "Another billing update is in progress. We’ll check again shortly.",
        );
      }
      return toActionState(
        "ERROR",
        "Paddle is temporarily unavailable. Your last confirmed billing details are shown. Try refreshing billing shortly.",
      );
    }
    revalidatePath("/account/plan");
    const pending =
      account &&
      (await prisma.billingCheckout.count({
        where: { accountId: account.id, closedAt: null },
      }));
    if (pending)
      return toActionState(
        "PENDING",
        "Your checkout is still open. If you already paid, wait for confirmation before trying again.",
      );
    return toActionState("SUCCESS", "Billing details are up to date.");
  } catch (error) {
    return authActionError(error);
  }
};

export const abandonCheckout = async (_state: ActionState, _data: FormData) => {
  const { user, session } = await getAuthOrRedirect();
  try {
    await limitSourceRequest("billing-discard");
    await discardCheckout(user.id, session.id);
    const account = await prisma.billingAccount.findUnique({
      where: { userId: user.id },
    });
    if (account) await syncBillingAccount(account.id);
    revalidatePath("/account/plan");
    const pending =
      account &&
      (await prisma.billingCheckout.count({
        where: { accountId: account.id, closedAt: null },
      }));
    return toActionState(
      pending ? "PENDING" : "SUCCESS",
      pending
        ? "We’re checking whether this checkout can be closed. A payment already processing may still complete."
        : "Checkout updated. Review your subscription before starting another payment.",
    );
  } catch (error) {
    return authActionError(error);
  }
};
