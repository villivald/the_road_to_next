import { headers } from "next/headers";
import Link from "next/link";
import styles from "@/components/shell.module.css";
import ThemeSwitcher from "@/components/theme/theme-switcher";
import { getAuth } from "@/features/auth/actions/get-auth";
import { signOut } from "@/features/auth/actions/sign-out";
import {
  accountProfilePath,
  browsePath,
  emailVerificationPath,
  listsPath,
  reservationsPath,
  signInPath,
  signUpPath,
} from "@/paths";

export default async function Header() {
  if ((await headers()).get("x-wishlist-view") === "guest") {
    return (
      <header className={styles.header}>
        <div className={styles["header-inner"]}>
          <span className={styles.brand}>Wishlist · Guest view</span>
          <nav aria-label="Guest navigation" className={styles.navigation}>
            <form action="/" method="get">
              <button type="submit" className={styles["text-button"]}>
                Open Wishlist
              </button>
            </form>
            <ThemeSwitcher />
          </nav>
        </div>
      </header>
    );
  }
  const { user } = await getAuth();
  return (
    <header className={styles.header}>
      <div className={styles["header-inner"]}>
        <Link href="/" className={styles.brand}>
          Wishlist
        </Link>
        <nav aria-label="Main navigation" className={styles.navigation}>
          <Link href={browsePath}>Browse</Link>
          {user ? (
            <>
              <Link
                href={user.emailVerified ? listsPath : emailVerificationPath}
              >
                {user.emailVerified ? "My lists" : "Verify email"}
              </Link>
              {user.emailVerified && (
                <>
                  <Link href={reservationsPath}>My reservations</Link>
                  <Link href={accountProfilePath}>Account</Link>
                </>
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
