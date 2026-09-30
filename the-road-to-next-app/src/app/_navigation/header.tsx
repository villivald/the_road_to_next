import Link from "next/link";
import styles from "@/components/shell.module.css";
import ThemeSwitcher from "@/components/theme/theme-switcher";
import { getAuth } from "@/features/auth/actions/get-auth";
import { signOut } from "@/features/auth/actions/sign-out";
import {
  accountProfilePath,
  emailVerificationPath,
  listsPath,
  signInPath,
  signUpPath,
} from "@/paths";

export default async function Header() {
  const { user } = await getAuth();
  return (
    <header className={styles.header}>
      <div className={styles["header-inner"]}>
        <Link href="/" className={styles.brand}>
          Wishlist
        </Link>
        <nav aria-label="Main navigation" className={styles.navigation}>
          {user ? (
            <>
              <Link
                href={user.emailVerified ? listsPath : emailVerificationPath}
              >
                {user.emailVerified ? "My lists" : "Verify email"}
              </Link>
              {user.emailVerified && (
                <Link href={accountProfilePath}>Account</Link>
              )}
              <form action={signOut}>
                <button type="submit" className={styles["text-button"]}>
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href={signInPath}>Sign in</Link>
              <Link href={signUpPath}>Create account</Link>
            </>
          )}
          <ThemeSwitcher />
        </nav>
      </div>
    </header>
  );
}
