import { Compass, Gift, Heart, List, UserRound } from "lucide-react";
import { headers } from "next/headers";
import styles from "@/components/shell.module.css";
import ThemeSwitcher from "@/components/theme/theme-switcher";
import { getAuth } from "@/features/auth/actions/get-auth";
import { signOut } from "@/features/auth/actions/sign-out";
import { getHomePath } from "@/features/auth/utils/home-path";
import { localizedPath } from "@/i18n/config";
import { LanguageSwitcher } from "@/i18n/language-switcher";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
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
  const t = await getText();

  if ((await headers()).get("x-wishlist-view") === "guest") {
    return (
      <header className={styles.header}>
        <div className={styles["header-inner"]}>
          <span className={styles.brand}>{t("Wishlist · Guest view")}</span>
          <nav aria-label={t("Guest navigation")} className={styles.navigation}>
            <form action={localizedPath("/", t.locale)} method="get">
              <button type="submit" className={styles["text-button"]}>
                {t("Open Wishlist")}
              </button>
            </form>
            <LanguageSwitcher />
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
          aria-label={t("Main navigation")}
          className={`${styles.navigation} ${user?.emailVerified ? styles["member-navigation"] : ""}`}
        >
          <NavLink href={browsePath}>
            <Compass size={18} aria-hidden="true" />
            {t("Browse")}
          </NavLink>
          {user ? (
            <>
              <NavLink
                href={user.emailVerified ? listsPath : emailVerificationPath}
              >
                <List size={18} aria-hidden="true" />
                {user.emailVerified ? t("My lists") : t("Verify email")}
              </NavLink>
              {user.emailVerified && (
                <>
                  <NavLink href={reservationsPath}>
                    <Gift size={18} aria-hidden="true" />
                    {t("My reservations")}
                  </NavLink>
                  <NavLink href={accountProfilePath} match="/account">
                    <UserRound size={18} aria-hidden="true" />
                    {t("Account")}
                  </NavLink>
                </>
              )}
            </>
          ) : (
            <>
              <NavLink href={signInPath}>{t("Sign in")}</NavLink>
              <NavLink href={signUpPath}>{t("Create account")}</NavLink>
            </>
          )}
        </nav>
        <div className={styles["header-tools"]}>
          {user && (
            <form action={signOut}>
              <button type="submit" className={styles["text-button"]}>
                {t("Sign out")}
              </button>
            </form>
          )}
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
