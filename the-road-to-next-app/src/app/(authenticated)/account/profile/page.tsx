import Link from "next/link";
import styles from "@/components/shell.module.css";
import { ProfileForm } from "@/features/account/components/profile-form";
import { readProfile } from "@/features/account/service/account";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { ImageEditor } from "@/features/media/components/image-editor";
import { readAvatar } from "@/features/media/service/media";
import { accountDeletePath, accountPasswordPath } from "@/paths";

export default async function AccountPage() {
  const { user } = await getAuthOrRedirect();

  const [image, profile] = await Promise.all([
    readAvatar(user.id),
    readProfile(user.id),
  ]);

  return (
    <section className={styles["account-panel"]}>
      <h1>Your account</h1>
      <dl className={styles.details}>
        <div>
          <dt>Username</dt>
          <dd>{user.username}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Email status</dt>
          <dd>Verified</dd>
        </div>
      </dl>
      <ProfileForm profile={profile} />
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
