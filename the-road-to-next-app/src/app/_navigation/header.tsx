import { Compass, Gift, Heart, List, UserRound } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import styles from "@/components/shell.module.css";
import ThemeSwitcher from "@/components/theme/theme-switcher";
import { getAuth } from "@/features/auth/actions/get-auth";
import { signOut } from "@/features/auth/actions/sign-out";
import { getHomePath } from "@/features/auth/utils/home-path";
import {
  accountProfilePath,
  browsePath,
  emailVerificationPath,
  listsPath,
  reservationsPath,
  signInPath,
  signUpPath,
} from "@/paths";
import { NavLink } from "./nav-link";

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
        <Link href={getHomePath(user)} className={styles.brand}>
          <Heart size={23} aria-hidden="true" />
          Wishlist
        </Link>
        <nav
          aria-label="Main navigation"
          className={`${styles.navigation} ${user?.emailVerified ? styles["member-navigation"] : ""}`}
        >
          <NavLink href={browsePath}>
            <Compass size={18} aria-hidden="true" />
            Browse
          </NavLink>
          {user ? (
            <>
              <NavLink
                href={user.emailVerified ? listsPath : emailVerificationPath}
              >
                <List size={18} aria-hidden="true" />
                {user.emailVerified ? "My lists" : "Verify email"}
              </NavLink>
              {user.emailVerified && (
                <>
                  <NavLink href={reservationsPath}>
                    <Gift size={18} aria-hidden="true" />
                    My reservations
                  </NavLink>
                  <NavLink href={accountProfilePath} match="/account">
                    <UserRound size={18} aria-hidden="true" />
                    Account
                  </NavLink>
                </>
              )}
            </>
          ) : (
            <>
              <NavLink href={signInPath}>Sign in</NavLink>
              <NavLink href={signUpPath}>Create account</NavLink>
            </>
          )}
        </nav>
        <div className={styles["header-tools"]}>
          {user && (
            <form action={signOut}>
              <button type="submit" className={styles["text-button"]}>
                Sign out
              </button>
            </form>
          )}
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
