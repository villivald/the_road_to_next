import { AccountForm } from "@/components/account-form";
import { AccountPanel } from "@/components/account-panel";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import { passwordForgotPath } from "@/paths";

export default async function PasswordResetPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const t = await getText();

  const { tokenId } = await params;
  return (
    <AccountPanel
      title={t("Reset your password")}
      description={t(
        "Choose a new password. Reset links expire after 30 minutes and can be used once.",
      )}
      footer={<Link href={passwordForgotPath}>{t("Request a new link")}</Link>}
    >
      <AccountForm mode="passwordReset" tokenId={tokenId} />
    </AccountPanel>
  );
}
