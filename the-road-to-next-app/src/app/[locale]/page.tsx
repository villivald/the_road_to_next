import Image from "next/image";
import styles from "@/components/shell.module.css";
import { getAuth } from "@/features/auth/actions/get-auth";
import { getHomePath } from "@/features/auth/utils/home-path";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import { redirect } from "@/i18n/server-navigation";
import { browsePath, signUpPath } from "@/paths";

export default async function HomePage() {
  const t = await getText();

  const { user } = await getAuth();

  if (user) {
    return await redirect(getHomePath(user));
  }

  return (
    <section className={styles.hero}>
      <div className={styles["hero-copy"]}>
        <p className={styles.eyebrow}>{t("Good things, remembered")}</p>
        <h1>{t("A little space for your wishes.")}</h1>
        <p className={styles.muted}>
          {t(
            "Collect the things you love, share a list with your people, and make finding the right gift a little easier.",
          )}
        </p>
        <div className={styles.actions}>
          <Link href={signUpPath} className={styles.button}>
            {t("Create your account")}
          </Link>
          <Link href={browsePath} className={styles["secondary-button"]}>
            {t("Browse public wishlists")}
          </Link>
        </div>
        <p className={styles.muted}>
          {t("Start with a title. Make it your own.")}
        </p>
      </div>
      <div className={styles["hero-art"]} aria-hidden="true">
        <Image
          src="/illustrations/openmoji/gift.svg"
          width={88}
          height={88}
          alt=""
        />
        <p className={styles.eyebrow}>{t("A few little wishes")}</p>
        <div className={styles["hero-sample"]}>
          <Image
            src="/illustrations/openmoji/coffee.svg"
            width={48}
            height={48}
            alt=""
          />
          <div>
            {t("A favorite morning mug")}
            <span>{t("For slow starts")}</span>
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
            {t("The next great read")}
            <span>{t("For a quiet afternoon")}</span>
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
            {t("Something thoughtful")}
            <span>{t("For someone you love")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
