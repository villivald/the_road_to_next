import Link from "next/link";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { accountPasswordPath } from "@/paths";

export default async function AccountPage() {
  const { user } = await getAuthOrRedirect();

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
      <Link href={accountPasswordPath}>Change password</Link>
    </section>
  );
}
