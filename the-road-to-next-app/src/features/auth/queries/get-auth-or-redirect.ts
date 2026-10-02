import { redirect } from "next/navigation";
import { emailVerificationPath, signInPath } from "@/paths";
import { getAuth } from "../actions/get-auth";
import { authReturnPath } from "../utils/return-to";

export const getAuthOrRedirect = async (options?: {
  checkEmailVerified?: boolean;
  returnTo?: string;
}) => {
  const auth = await getAuth();

  if (!auth.user) {
    redirect(authReturnPath(signInPath, options?.returnTo));
  }

  if ((options?.checkEmailVerified ?? true) && !auth.user.emailVerified) {
    redirect(authReturnPath(emailVerificationPath, options?.returnTo));
  }
  return { user: auth.user, session: auth.session };
};
