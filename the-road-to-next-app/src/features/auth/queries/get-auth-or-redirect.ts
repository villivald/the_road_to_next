import { redirect } from "next/navigation";
import { emailVerificationPath, signInPath } from "@/paths";
import { getAuth } from "../actions/get-auth";

export const getAuthOrRedirect = async (options?: {
  checkEmailVerified?: boolean;
}) => {
  const auth = await getAuth();

  if (!auth.user) {
    redirect(signInPath);
  }

  if ((options?.checkEmailVerified ?? true) && !auth.user.emailVerified) {
    redirect(emailVerificationPath);
  }
  return { user: auth.user, session: auth.session };
};
