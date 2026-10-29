import { AccountForm } from "@/components/account-form";
import { AccountPanel } from "@/components/account-panel";
import { BackLink } from "@/components/back-link";
import { useText } from "@/i18n/use-text";
import { signInPath } from "@/paths";

export default function PasswordForgotPage() {
  const t = useText();

  return (
    <AccountPanel
      title={t("Forgot your password?")}
      description={t("Enter your email and we will send you a reset link.")}
      footer={<BackLink href={signInPath}>{t("Back to sign in")}</BackLink>}
    >
      <AccountForm mode="passwordForgot" />
    </AccountPanel>
  );
}
