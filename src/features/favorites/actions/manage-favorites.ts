"use server";

import { z } from "zod";
import {
  type ActionState,
  fromErrorToActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { limitSourceRequest } from "@/features/auth/service/request-limit";
import { AuthError } from "@/features/auth/service/security";
import { revalidatePath } from "@/i18n/server-navigation";
import {
  browsePath,
  favoritesPath,
  listsPath,
  reservationsPath,
  sharedListsPath,
} from "@/paths";
import { FavoriteError, setFavorite } from "../service/favorites";
import type { FavoriteKind } from "../types";

export const changeFavorite = async (
  kind: FavoriteKind,
  targetId: string,
  _state: ActionState,
  data: FormData,
) => {
  const { user } = await getAuthOrRedirect({ returnTo: favoritesPath });
  try {
    await limitSourceRequest("favorite-change");
    const saved = z.enum(["true", "false"]).parse(data.get("saved")) === "true";
    await setFavorite(user.id, { kind, targetId, saved });
    for (const path of [
      favoritesPath,
      browsePath,
      listsPath,
      sharedListsPath,
      reservationsPath,
    ])
      revalidatePath(path);
    revalidatePath("/lists/[listId]", "page");
    revalidatePath("/lists/[listId]/wishes/[wishId]", "page");
    return toActionState(
      "SUCCESS",
      saved ? "Added to favorites." : "Removed from favorites.",
    );
  } catch (error) {
    return error instanceof FavoriteError || error instanceof AuthError
      ? toActionState("ERROR", error.message)
      : fromErrorToActionState(error);
  }
};
