import { CircleCheck, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import styles from "@/components/shell.module.css";
import { ProfileForm } from "@/features/account/components/profile-form";
import { readProfile } from "@/features/account/service/account";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { ImageEditor } from "@/features/media/components/image-editor";
import { readAvatar } from "@/features/media/service/media";
import {
  accountDeletePath,
  accountPasswordPath,
  accountPlanPath,
} from "@/paths";

export default async function AccountPage() {
  const { user } = await getAuthOrRedirect();

  const [image, profile] = await Promise.all([
    readAvatar(user.id),
    readProfile(user.id),
  ]);

  return (
    <section className={styles["account-panel"]}>
      <h1>Your account</h1>
      <dl className={styles["account-details"]}>
        <div>
          <dt>
            <UserRound size={18} aria-hidden="true" /> Username
          </dt>
          <dd>
            <span className={styles["account-value"]}>{user.username}</span>
          </dd>
        </div>
        <div>
          <dt>
            <Mail size={18} aria-hidden="true" /> Email
          </dt>
          <dd>
            <span className={styles["account-value"]}>{user.email}</span>
            <span className={styles["verified-email"]}>
              <CircleCheck size={15} aria-hidden="true" /> Verified
            </span>
          </dd>
        </div>
      </dl>
      <ProfileForm profile={profile} />
      <Link href={accountPlanPath}>Your plan and promo codes</Link>
      <ImageEditor
        target={{ kind: "avatar" }}
        image={image}
        label="Your avatar"
      />
      <Link href={accountPasswordPath}>Change password</Link>
      <Link href={accountDeletePath}>Delete account</Link>
    </section>
  );
}
