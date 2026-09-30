import { cookies } from "next/headers";
import { cache } from "react";
import { validateSession } from "@/lib/lucia";
import { SESSION_COOKIE_NAME } from "../utils/session-cookie";

export const getAuth = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  return token ? validateSession(token) : { user: null, session: null };
});
