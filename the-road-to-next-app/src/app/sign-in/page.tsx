import Link from "next/link";
import { AccountForm } from "@/components/account-form";
import { AccountPanel } from "@/components/account-panel";
import { passwordForgotPath, signUpPath } from "@/paths";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;
  return (
    <AccountPanel
      title="Welcome back"
      description={
        reset === "success"
          ? "Your password has been reset. Sign in with your new password."
          : "Sign in to your Wishlist account."
      }
      footer={
        <>
          <Link href={signUpPath}>Create an account</Link>
          <Link href={passwordForgotPath}>Forgot password?</Link>
        </>
      }
    >
      <AccountForm mode="signIn" />
    </AccountPanel>
  );
}
