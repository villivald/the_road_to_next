import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "@/components/shell.module.css";
import { getAuth } from "@/features/auth/actions/get-auth";
import { getHomePath } from "@/features/auth/utils/home-path";
import { browsePath, signUpPath } from "@/paths";

export default async function HomePage() {
  const { user } = await getAuth();

  if (user) {
    redirect(getHomePath(user));
  }

  return (
    <section className={styles.hero}>
      <div className={styles["hero-copy"]}>
        <p className={styles.eyebrow}>Good things, remembered</p>
        <h1>A little space for your wishes.</h1>
        <p className={styles.muted}>
          Collect the things you love, share a list with your people, and make
          finding the right gift a little easier.
        </p>
        <div className={styles.actions}>
          <Link href={signUpPath} className={styles.button}>
            Create your account
          </Link>
          <Link href={browsePath} className={styles["secondary-button"]}>
            Browse public wishlists
          </Link>
        </div>
        <p className={styles.muted}>Start with a title. Make it your own.</p>
      </div>
      <div className={styles["hero-art"]} aria-hidden="true">
        <Image
          src="/illustrations/openmoji/gift.svg"
          width={88}
          height={88}
          alt=""
        />
        <p className={styles.eyebrow}>A few little wishes</p>
        <div className={styles["hero-sample"]}>
          <Image
            src="/illustrations/openmoji/coffee.svg"
            width={48}
            height={48}
            alt=""
          />
          <div>
            A favorite morning mug<span>For slow starts</span>
          </div>
        </div>
        <div className={styles["hero-sample"]}>
          <Image
            src="/illustrations/openmoji/book.svg"
            width={48}
            height={48}
            alt=""
          />
          <div>
            The next great read<span>For a quiet afternoon</span>
          </div>
        </div>
        <div className={styles["hero-sample"]}>
          <Image
            src="/illustrations/openmoji/heart.svg"
            width={48}
            height={48}
            alt=""
          />
          <div>
            Something thoughtful<span>For someone you love</span>
          </div>
        </div>
      </div>
    </section>
  );
}
