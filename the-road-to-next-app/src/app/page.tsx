import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "@/components/shell.module.css";
import { getAuth } from "@/features/auth/actions/get-auth";
import {
  browsePath,
  emailVerificationPath,
  listsPath,
  signUpPath,
} from "@/paths";

export default async function HomePage() {
  const { user } = await getAuth();

  if (user) {
    redirect(user.emailVerified ? listsPath : emailVerificationPath);
  }

  return (
    <section className={styles.hero}>
      <h1>A little space for your wishes.</h1>
      <p className={styles.muted}>
        Keep an account for the things you love, the ideas you want to remember,
        and the gifts that would make your day.
      </p>
      <Link href={browsePath} className={styles["secondary-button"]}>
        Browse public wishlists
      </Link>
      <Link href={signUpPath} className={styles.button}>
        Create your account
      </Link>
    </section>
  );
}
