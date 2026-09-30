import Link from "next/link";
import { AccountForm } from "@/components/account-form";
import { AccountPanel } from "@/components/account-panel";
import { accountProfilePath } from "@/paths";

export default function PasswordPage() {
  return (
    <AccountPanel
      title="Change password"
      description="Your current password is required. Changing it signs out your other sessions."
      footer={<Link href={accountProfilePath}>Back to account</Link>}
    >
      <AccountForm mode="passwordChange" />
    </AccountPanel>
  );
}
