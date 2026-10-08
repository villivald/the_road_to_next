import { AccountForm } from "@/components/account-form";
import { AccountPanel } from "@/components/account-panel";
import { Link } from "@/i18n/navigation";
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
      footer={<Link href={accountProfilePath}>{t("Back to account")}</Link>}
    >
      <AccountForm mode="passwordChange" />
    </AccountPanel>
  );
}
