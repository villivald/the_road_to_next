"use server";

import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { AuthError } from "@/features/auth/service/security";
import { reservationsPath } from "@/paths";
import { searchGroupPeople } from "../service/groups";

export async function searchPeople(reservationId: string, query: string) {
  const { user } = await getAuthOrRedirect({ returnTo: reservationsPath });
  try {
    return {
      people: await searchGroupPeople(user.id, reservationId, query),
      error: null,
    };
  } catch (error) {
    return {
      people: [],
      error:
        error instanceof AuthError
          ? error.message
          : "Something went wrong. Please try again.",
    };
  }
}
