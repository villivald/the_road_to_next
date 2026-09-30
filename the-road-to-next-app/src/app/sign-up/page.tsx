import Link from "next/link";
import { AccountForm } from "@/components/account-form";
import { AccountPanel } from "@/components/account-panel";
import { signInPath } from "@/paths";

export default function SignUpPage() {
  return (
    <AccountPanel
      title="Create your account"
      description="Start with your name, email, and a secure password."
      footer={<Link href={signInPath}>Already have an account? Sign in</Link>}
    >
      <AccountForm mode="signUp" />
    </AccountPanel>
  );
}
