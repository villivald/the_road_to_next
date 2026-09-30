import Link from "next/link";
import { AccountForm } from "@/components/account-form";
import { AccountPanel } from "@/components/account-panel";
import { passwordForgotPath } from "@/paths";

export default async function PasswordResetPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  return (
    <AccountPanel
      title="Reset your password"
      description="Choose a new password. Reset links expire after 30 minutes and can be used once."
      footer={<Link href={passwordForgotPath}>Request a new link</Link>}
    >
      <AccountForm mode="passwordReset" tokenId={tokenId} />
    </AccountPanel>
  );
}
