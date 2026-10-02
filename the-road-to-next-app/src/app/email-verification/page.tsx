import { redirect } from "next/navigation";
import { AccountForm } from "@/components/account-form";
import { AccountPanel } from "@/components/account-panel";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { safeReturnTo } from "@/features/auth/utils/return-to";

export default async function EmailVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const returnTo = safeReturnTo((await searchParams).returnTo);
  const { user } = await getAuthOrRedirect({
    checkEmailVerified: false,
    returnTo,
  });

  if (user.emailVerified) {
    redirect(returnTo);
  }

  return (
    <AccountPanel
      title="Verify your email"
      description={`Check ${user.email} for a code. Codes expire after 30 minutes. If no email arrived, send a new code below.`}
    >
      <AccountForm mode="emailVerification" returnTo={returnTo} />
      <AccountForm mode="emailVerificationResend" />
    </AccountPanel>
  );
}
