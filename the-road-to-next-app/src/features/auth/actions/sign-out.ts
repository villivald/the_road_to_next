"use server";

import { redirect } from "next/navigation";
import { invalidateSession } from "@/lib/lucia";
import { signInPath } from "@/paths";
import { deleteSessionCookie } from "../utils/session-cookie";
import { getAuth } from "./get-auth";

export const signOut = async () => {
  const { session } = await getAuth();

  if (session) {
    await invalidateSession(session.id);
  }

  await deleteSessionCookie();

  redirect(signInPath);
};
