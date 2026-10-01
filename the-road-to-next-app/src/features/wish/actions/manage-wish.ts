"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  type ActionState,
  fromErrorToActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { WishlistError } from "@/features/wishlist/service/lists";
import { listPath, reservationsPath, wishPath } from "@/paths";
import {
  createWish,
  deleteWish,
  transitionWish,
  updateWish,
  WishError,
} from "../service/wishes";

const wishInput = (data: FormData) => ({
  title: data.get("title"),
  description: data.get("description") ?? "",
  externalUrl: data.get("externalUrl") ?? "",
  price: data.get("price") ?? "",
  currency: data.get("currency") ?? "",
  priority: data.get("priority") ?? "",
  hidden: data.get("hidden") === "on",
});

const actionError = (error: unknown, data?: FormData) => {
  if (error instanceof WishError || error instanceof WishlistError) {
    return toActionState("ERROR", error.message, data);
  }

  return fromErrorToActionState(error, data);
};

const refreshWish = (listId: string, wishId: string) => {
  revalidatePath(reservationsPath);
  revalidatePath(listPath(listId));
  revalidatePath(wishPath(listId, wishId));
  revalidatePath(`${wishPath(listId, wishId)}/edit`);
  revalidatePath(`${wishPath(listId, wishId)}/delete`);
};

export const addWish = async (
  listId: string,
  _state: ActionState,
  data: FormData,
) => {
  const { user } = await getAuthOrRedirect();
  let id: string;

  try {
    ({ id } = await createWish(user.id, listId, wishInput(data)));
  } catch (error) {
    return actionError(error, data);
  }

  revalidatePath(listPath(listId));
  redirect(`${wishPath(listId, id)}?created=1`);
};

export const editWish = async (
  listId: string,
  wishId: string,
  _state: ActionState,
  data: FormData,
) => {
  const { user } = await getAuthOrRedirect();

  try {
    await updateWish(user.id, listId, wishId, wishInput(data));
  } catch (error) {
    return actionError(error, data);
  }

  refreshWish(listId, wishId);
  redirect(`${wishPath(listId, wishId)}?saved=1`);
};

export const changeWishState = async (
  listId: string,
  wishId: string,
  _state: ActionState,
  data: FormData,
) => {
  const { user } = await getAuthOrRedirect();

  try {
    await transitionWish(user.id, listId, wishId, data.get("transition"));
  } catch (error) {
    return actionError(error);
  }

  refreshWish(listId, wishId);

  return toActionState("SUCCESS", "Wish updated.");
};

export const removeWish = async (
  listId: string,
  wishId: string,
  _state: ActionState,
  data: FormData,
) => {
  const { user } = await getAuthOrRedirect();

  try {
    z.literal("delete", {
      error: "Confirm that you want to delete this wish.",
    }).parse(data.get("confirm"));
    await deleteWish(user.id, listId, wishId);
  } catch (error) {
    return actionError(error);
  }

  refreshWish(listId, wishId);
  redirect(`${listPath(listId)}?wishDeleted=1`);
};
