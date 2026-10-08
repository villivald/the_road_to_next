import { redirect } from "@/i18n/server-navigation";
import { emailVerificationPath, signInPath } from "@/paths";
import { getAuth } from "../actions/get-auth";
import { authReturnPath } from "../utils/return-to";

export const getAuthOrRedirect = async (options?: {
  checkEmailVerified?: boolean;
  returnTo?: string;
}) => {
  const auth = await getAuth();

  if (!auth.user) {
    return await redirect(authReturnPath(signInPath, options?.returnTo));
  }

  if ((options?.checkEmailVerified ?? true) && !auth.user.emailVerified) {
    return await redirect(
      authReturnPath(emailVerificationPath, options?.returnTo),
    );
  }
  return { user: auth.user, session: auth.session };
};
