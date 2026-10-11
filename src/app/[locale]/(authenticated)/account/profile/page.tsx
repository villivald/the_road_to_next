import { Heart, Sparkles } from "lucide-react";
import styles from "@/components/shell.module.css";
import { AccountDetails } from "@/features/account/components/account-details";
import { ProfileForm } from "@/features/account/components/profile-form";
import { readProfile } from "@/features/account/service/account";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { ImageEditor } from "@/features/media/components/image-editor";
import { readAvatar } from "@/features/media/service/media";
import { readPremiumAccess } from "@/features/premium/service/entitlements";
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

  const [image, profile, access] = await Promise.all([
    readAvatar(user.id),
    readProfile(user.id),
    readPremiumAccess(user.id),
  ]);

  return (
    <section className={styles["account-panel"]}>
      <h1>{t("Your account")}</h1>
      <AccountDetails user={user} />
      <ProfileForm profile={profile} />
      <section
        className={styles["plan-summary"]}
        aria-labelledby="profile-plan-heading"
      >
        <p className={styles.muted}>{t("Your current plan")}</p>
        <h2 id="profile-plan-heading" className={styles["icon-label"]}>
          {access.plan === "PREMIUM" ? (
            <Sparkles size={20} aria-hidden="true" />
          ) : (
            <Heart size={20} aria-hidden="true" />
          )}
          {access.plan === "PREMIUM" ? "Premium" : t("Free")}
        </h2>
        <p>
          {access.plan === "PREMIUM"
            ? t("Choose who can see your lists.")
            : t("Premium adds private sharing and help from trusted people.")}
        </p>
        <div className={styles.actions}>
          <Link href={accountPlanPath} className={styles["secondary-button"]}>
            {t("Your plan and promo codes")}
          </Link>
          <Link href="/premium">{t("Compare plans")}</Link>
        </div>
      </section>
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
