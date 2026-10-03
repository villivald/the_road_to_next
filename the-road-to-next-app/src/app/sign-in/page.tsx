import Link from "next/link";
import { AccountForm } from "@/components/account-form";
import { AccountPanel } from "@/components/account-panel";
import { authReturnPath, safeReturnTo } from "@/features/auth/utils/return-to";
import { passwordForgotPath, signUpPath } from "@/paths";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    reset?: string;
    deleted?: string;
    returnTo?: string;
  }>;
}) {
  const { reset, deleted, returnTo: requestedReturnTo } = await searchParams;
  const returnTo = safeReturnTo(requestedReturnTo);
  return (
    <AccountPanel
      title="Welcome back"
      description={
        deleted === "1"
          ? "Your account has been deleted."
          : reset === "success"
            ? "Your password has been reset. Sign in with your new password."
            : "Sign in to your Wishlist account."
      }
      footer={
        <>
          <Link href={authReturnPath(signUpPath, returnTo)}>
            Create an account
          </Link>
          <Link href={passwordForgotPath}>Forgot password?</Link>
        </>
      }
    >
      <AccountForm mode="signIn" returnTo={returnTo} />
    </AccountPanel>
  );
}
