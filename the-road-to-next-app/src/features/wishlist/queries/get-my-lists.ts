import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { readOwnedWishlists } from "../service/lists";

export const getMyLists = async (page = 1) => {
  const { user } = await getAuthOrRedirect();

  return readOwnedWishlists(user.id, page);
};
