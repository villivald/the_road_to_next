import Link from "next/link";
import { AccountForm } from "@/components/account-form";
import { AccountPanel } from "@/components/account-panel";
import { authReturnPath, safeReturnTo } from "@/features/auth/utils/return-to";
import { signInPath } from "@/paths";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const returnTo = safeReturnTo((await searchParams).returnTo);
  return (
    <AccountPanel
      title="Create your account"
      description="Choose a username and enter your email and a secure password."
      footer={
        <Link href={authReturnPath(signInPath, returnTo)}>
          Already have an account? Sign in
        </Link>
      }
    >
      <AccountForm mode="signUp" returnTo={returnTo} />
    </AccountPanel>
  );
}
