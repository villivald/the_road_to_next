import { ArrowUpRight, Heart, Mail } from "lucide-react";
import { headers } from "next/headers";
import { getAuth } from "@/features/auth/actions/get-auth";
import { getHomePath } from "@/features/auth/utils/home-path";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import styles from "./footer.module.css";

export default async function Footer() {
  const t = await getText();

  if ((await headers()).get("x-wishlist-view") === "guest") {
    return (
      <footer className={styles["guest-footer"]}>
        {t("Wishlist · Shared with care")}
      </footer>
    );
  }

  const { user } = await getAuth();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.intro}>
          <Link href={getHomePath(user)} className={styles.brand}>
            <Heart aria-hidden="true" />
            Wishlist
          </Link>
          <p>{t("Good things are even better shared.")}</p>
          <a className={styles.contact} href="mailto:support@wishlist.fi">
            <Mail size={18} aria-hidden="true" />
            {t("Contact support")} <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        <nav aria-label={t("Footer explore")} className={styles.links}>
          <h2>{t("Explore")}</h2>
          <Link href="/browse">{t("Explore wishlists")}</Link>
          <Link href="/browse?view=users">{t("Find people")}</Link>
          <Link href="/lists">{t("Your wishlists")}</Link>
          <Link href="/site-map">{t("Site map")}</Link>
        </nav>
        <nav aria-label={t("Footer information")} className={styles.links}>
          <h2>{t("Help and information")}</h2>
          <Link href="/about">{t("About and credits")}</Link>
          <Link href="/accessibility">{t("Accessibility")}</Link>
          <Link href="/privacy">{t("Privacy")}</Link>
          <Link href="/terms">{t("Terms")}</Link>
        </nav>
        <div className={styles.bottom}>
          <p>
            {t("Made by")} <a href="https://www.villivald.com/">villivald</a> ·
            © {new Date().getUTCFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
