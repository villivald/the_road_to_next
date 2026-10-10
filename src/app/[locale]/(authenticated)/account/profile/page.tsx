import { CircleCheck, Mail, UserRound } from "lucide-react";
import styles from "@/components/shell.module.css";
import { ProfileForm } from "@/features/account/components/profile-form";
import { readProfile } from "@/features/account/service/account";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { ImageEditor } from "@/features/media/components/image-editor";
import { readAvatar } from "@/features/media/service/media";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import {
  accountDeletePath,
  accountPasswordPath,
  accountPlanPath,
} from "@/paths";

export default async function AccountPage() {
  const t = await getText();

  const { user } = await getAuthOrRedirect();

  const [image, profile] = await Promise.all([
    readAvatar(user.id),
    readProfile(user.id),
  ]);

  return (
    <section className={styles["account-panel"]}>
      <h1>{t("Your account")}</h1>
      <dl className={styles["account-details"]}>
        <div>
          <dt>
            <UserRound size={18} aria-hidden="true" /> {t("Username")}
          </dt>
          <dd>
            <span className={styles["account-value"]}>{user.username}</span>
          </dd>
        </div>
        <div>
          <dt>
            <Mail size={18} aria-hidden="true" /> {t("Email")}
          </dt>
          <dd>
            <span className={styles["account-value"]}>{user.email}</span>
            <span className={styles["verified-email"]}>
              <CircleCheck size={15} aria-hidden="true" /> {t("Verified")}
            </span>
          </dd>
        </div>
      </dl>
      <ProfileForm profile={profile} />
      <Link href={accountPlanPath}>{t("Your plan and promo codes")}</Link>
      <ImageEditor
        target={{ kind: "avatar" }}
        image={image}
        label={t("Your avatar")}
      />
      <Link href={accountPasswordPath}>{t("Change password")}</Link>
      <Link href={accountDeletePath}>{t("Delete account")}</Link>
    </section>
  );
}
