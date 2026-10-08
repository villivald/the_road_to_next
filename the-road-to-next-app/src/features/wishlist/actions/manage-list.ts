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
import { PremiumError } from "@/features/premium/service/entitlements";
import { browsePath, listPath, listsPath, reservationsPath } from "@/paths";
import {
  createWishlist,
  deleteWishlist,
  setWishlistPublication,
  updateWishlist,
  WishlistError,
} from "../service/lists";

const listInput = (data: FormData) => ({
  title: data.get("title"),
  description: data.get("description") ?? "",
  reservationsEnabled: data.get("reservationsEnabled") === "on",
});

const actionError = (error: unknown, data?: FormData) => {
  if (error instanceof WishlistError || error instanceof PremiumError) {
    return toActionState("ERROR", error.message, data);
  }

  return fromErrorToActionState(error, data);
};

const refreshList = (id: string) => {
  revalidatePath(browsePath);
  revalidatePath(reservationsPath);
  revalidatePath(listsPath);
  revalidatePath(listPath(id));
  revalidatePath(`${listPath(id)}/edit`);
  revalidatePath(`${listPath(id)}/delete`);
  revalidatePath("/lists/[listId]/wishes/[wishId]", "page");
};

export const createList = async (_state: ActionState, data: FormData) => {
  const { user } = await getAuthOrRedirect();
  let id: string;

  try {
    ({ id } = await createWishlist(user.id, {
      ...listInput(data),
      visibility: data.get("visibility") ?? "PUBLIC",
    }));
  } catch (error) {
    return actionError(error, data);
  }

  revalidatePath(listsPath);
  redirect(`${listPath(id)}?created=1`);
};

export const updateList = async (
  id: string,
  _state: ActionState,
  data: FormData,
) => {
  const { user } = await getAuthOrRedirect();

  try {
    await updateWishlist(user.id, id, listInput(data));
  } catch (error) {
    return actionError(error, data);
  }

  refreshList(id);
  redirect(`${listPath(id)}?saved=1`);
};

export const changePublication = async (
  id: string,
  _state: ActionState,
  data: FormData,
) => {
  const { user } = await getAuthOrRedirect();

  try {
    await setWishlistPublication(user.id, id, data.get("publication"));
  } catch (error) {
    return actionError(error);
  }

  refreshList(id);

  return toActionState(
    "SUCCESS",
    data.get("publication") === "PUBLISHED"
      ? "List is now visible."
      : "List hidden from viewers. Active reservations have ended.",
  );
};

export const deleteList = async (
  id: string,
  _state: ActionState,
  data: FormData,
) => {
  const { user } = await getAuthOrRedirect();

  try {
    z.literal("delete", {
      error: "Confirm that you want to delete this list.",
    }).parse(data.get("confirm"));
    await deleteWishlist(user.id, id);
  } catch (error) {
    return actionError(error);
  }

  refreshList(id);
  redirect(`${listsPath}?deleted=1`);
};
