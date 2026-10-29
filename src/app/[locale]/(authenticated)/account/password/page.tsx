import { AccountForm } from "@/components/account-form";
import { AccountPanel } from "@/components/account-panel";
import { BackLink } from "@/components/back-link";
import { useText } from "@/i18n/use-text";
import { accountProfilePath } from "@/paths";

export default function PasswordPage() {
  const t = useText();

  return (
    <AccountPanel
      title={t("Change password")}
      description={t(
        "Your current password is required. Changing it signs out your other sessions.",
      )}
      footer={
        <BackLink href={accountProfilePath}>{t("Back to account")}</BackLink>
      }
    >
      <AccountForm mode="passwordChange" />
    </AccountPanel>
  );
}
