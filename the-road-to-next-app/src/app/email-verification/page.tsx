import { redirect } from "next/navigation";
import { AccountForm } from "@/components/account-form";
import { AccountPanel } from "@/components/account-panel";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { listsPath } from "@/paths";

export default async function EmailVerificationPage() {
  const { user } = await getAuthOrRedirect({ checkEmailVerified: false });

  if (user.emailVerified) {
    redirect(listsPath);
  }

  return (
    <AccountPanel
      title="Verify your email"
      description={`Check ${user.email} for a code. Codes expire after 30 minutes. If no email arrived, send a new code below.`}
    >
      <AccountForm mode="emailVerification" />
      <AccountForm mode="emailVerificationResend" />
    </AccountPanel>
  );
}
