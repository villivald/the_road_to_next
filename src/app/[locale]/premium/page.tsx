import { FlaskConical, Heart, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import styles from "@/components/shell.module.css";
import { getAuth } from "@/features/auth/actions/get-auth";
import { authReturnPath } from "@/features/auth/utils/return-to";
import { billingEnabled, plans } from "@/features/billing/service/config";
import { PlanBenefits } from "@/features/premium/components/plan-benefits";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";
import { accountPlanPath, emailVerificationPath, signUpPath } from "@/paths";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getText();
  return { title: t("Free and Premium") };
}

export default async function PremiumPage() {
  const t = await getText();
  const { user } = await getAuth();
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles["hero-copy"]}>
          <p className={styles.eyebrow}>Wishlist · Premium</p>
          <h1>{t("Free and Premium")}</h1>
          <p className={styles.description}>
            {t(
              "Everything you need for a public wishlist is free. Premium gives you more ways to share privately.",
            )}
          </p>
        </div>
        <div className={styles["hero-art"]} aria-hidden="true">
          <Image
            src="/illustrations/archive/hortus-malabaricus.jpg"
            width={480}
            height={395}
            sizes="(max-width: 760px) 320px, 400px"
            alt=""
          />
        </div>
      </div>
      <div className={styles["plan-comparison"]}>
        <section
          className={styles["plan-summary"]}
          aria-labelledby="free-heading"
        >
          <h2 id="free-heading" className={styles["icon-label"]}>
            <Heart aria-hidden="true" />
            {t("Free")}
          </h2>
          <p>{t("No subscription needed.")}</p>
          <ul>
            <li>
              {t(
                "Create lists and wishes, add images and product links, and reserve gifts.",
              )}
            </li>
            <li>
              {t(
                "Keep lists hidden while you prepare them, then make them visible to everyone.",
              )}
            </li>
          </ul>
          <Link
            href={user ? "/lists" : signUpPath}
            className={styles["secondary-button"]}
          >
            {user ? t("My lists") : t("Create account")}
          </Link>
        </section>
        <section
          className={styles["plan-summary"]}
          aria-labelledby="public-premium-heading"
        >
          <h2 id="public-premium-heading" className={styles["icon-label"]}>
            <Sparkles aria-hidden="true" />
            Premium
          </h2>
          <p>{t("Private sharing for the list owner")}</p>
          <PlanBenefits />
          <p className={styles.price}>
            {t.message(plans.month.display)} · {t.message(plans.year.display)}
          </p>
          <p>
            {t(
              "Choose monthly or annual billing. Both include the same features.",
            )}
          </p>
          <p className={styles.muted}>
            {t(
              "Includes applicable tax. Premium starts after payment confirmation.",
            )}
          </p>
          <p className={styles.muted}>
            {t(
              "Renews automatically until canceled. Cancel renewal in Paddle; paid access continues until its end date.",
            )}
          </p>
          <p>
            {t(
              "Promo codes grant Premium for a limited time without starting a subscription.",
            )}
          </p>
          <p className={styles.notice}>
            {billingEnabled() ? (
              <>
                <FlaskConical size={18} aria-hidden="true" />{" "}
                {t(
                  "Sandbox · Use Paddle test payment details only. No real money is charged.",
                )}
              </>
            ) : (
              t(
                "Subscriptions are not available yet. You can still use a promo code.",
              )
            )}
          </p>
          <Link
            href={
              user?.emailVerified
                ? accountPlanPath
                : authReturnPath(
                    user ? emailVerificationPath : signUpPath,
                    accountPlanPath,
                  )
            }
            className={styles.button}
          >
            {user?.emailVerified
              ? t("Your plan and promo codes")
              : user
                ? t("Verify email")
                : t("Create account")}
          </Link>
        </section>
      </div>
    </section>
  );
}
