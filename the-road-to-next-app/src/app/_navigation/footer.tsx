import { ArrowUpRight, Heart, Mail } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { getAuth } from "@/features/auth/actions/get-auth";
import { getHomePath } from "@/features/auth/utils/home-path";
import styles from "./footer.module.css";

export default async function Footer() {
  if ((await headers()).get("x-wishlist-view") === "guest") {
    return (
      <footer className={styles["guest-footer"]}>
        Wishlist · Shared with care
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
          <p>Good things are even better shared.</p>
          <a className={styles.contact} href="mailto:support@wishlist.fi">
            <Mail size={18} aria-hidden="true" />
            Contact support <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        <nav aria-label="Footer explore" className={styles.links}>
          <h2>Explore</h2>
          <Link href="/browse">Explore wishlists</Link>
          <Link href="/browse?view=users">Find people</Link>
          <Link href="/lists">Your wishlists</Link>
          <Link href="/site-map">Site map</Link>
        </nav>
        <nav aria-label="Footer information" className={styles.links}>
          <h2>Help and information</h2>
          <Link href="/about">About and credits</Link>
          <Link href="/accessibility">Accessibility</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
        <div className={styles.bottom}>
          <p>
            Made by <a href="https://www.villivald.com/">villivald</a> · ©{" "}
            {new Date().getUTCFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
