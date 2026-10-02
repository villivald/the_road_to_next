"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type ActionState,
  fromErrorToActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { AuthError } from "@/features/auth/service/security";
import { WishlistError } from "@/features/wishlist/service/lists";
import { browsePath, listPath, reservationsPath, wishPath } from "@/paths";
import {
  cancelReservation,
  ReservationError,
  reserveWish,
  revokeReservation,
} from "../service/reservations";

const actionError = (error: unknown) => {
  if (
    error instanceof ReservationError ||
    error instanceof WishlistError ||
    error instanceof AuthError
  ) {
    return toActionState("ERROR", error.message);
  }

  return fromErrorToActionState(error);
};

const refreshReservation = (listId: string, wishId: string) => {
  revalidatePath(browsePath);
  revalidatePath(reservationsPath);
  revalidatePath(listPath(listId));
  revalidatePath(wishPath(listId, wishId));
};

export const reserve = async (
  listId: string,
  wishId: string,
  _state: ActionState,
  _data: FormData,
) => {
  const { user } = await getAuthOrRedirect({
    returnTo: wishPath(listId, wishId),
  });

  try {
    await reserveWish(user.id, listId, wishId);
  } catch (error) {
    return actionError(error);
  }

  refreshReservation(listId, wishId);
  return toActionState(
    "SUCCESS",
    "Wish reserved. You can find it in My reservations.",
  );
};

export const cancel = async (
  listId: string,
  wishId: string,
  reservationId: string,
  _state: ActionState,
  _data: FormData,
) => {
  const { user } = await getAuthOrRedirect({
    returnTo: wishPath(listId, wishId),
  });

  try {
    await cancelReservation(user.id, listId, wishId, reservationId);
  } catch (error) {
    return actionError(error);
  }

  refreshReservation(listId, wishId);
  redirect(`${reservationsPath}?canceled=1`);
};

export const revoke = async (
  listId: string,
  wishId: string,
  reservationId: string,
  _state: ActionState,
  _data: FormData,
) => {
  const { user } = await getAuthOrRedirect({
    returnTo: wishPath(listId, wishId),
  });

  try {
    await revokeReservation(user.id, listId, wishId, reservationId);
  } catch (error) {
    return actionError(error);
  }

  refreshReservation(listId, wishId);
  return toActionState("SUCCESS", "Reservation revoked.");
};
