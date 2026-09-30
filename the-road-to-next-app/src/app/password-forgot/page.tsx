import Link from "next/link";
import { AccountForm } from "@/components/account-form";
import { AccountPanel } from "@/components/account-panel";
import { signInPath } from "@/paths";

export default function PasswordForgotPage() {
  return (
    <AccountPanel
      title="Forgot your password?"
      description="Enter your email and we will send you a reset link."
      footer={<Link href={signInPath}>Back to sign in</Link>}
    >
      <AccountForm mode="passwordForgot" />
    </AccountPanel>
  );
}
