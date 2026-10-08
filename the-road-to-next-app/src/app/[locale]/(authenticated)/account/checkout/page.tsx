import { notFound } from "next/navigation";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { PaddleCheckout } from "@/features/billing/components/paddle-checkout";
import { checkoutDetails } from "@/features/billing/service/checkout";
import { plans } from "@/features/billing/service/config";
import { Link } from "@/i18n/navigation";
import { getText } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Premium checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; _ptxn?: string }>;
}) {
  const t = await getText();

  const { user } = await getAuthOrRedirect();
  const query = await searchParams;
  let checkout;
  try {
    checkout = await checkoutDetails(user.id, query.id, query._ptxn);
  } catch {
    return (
      <section className={styles.editor}>
        <h1>{t("Checkout unavailable")}</h1>
        <p>
          {t(
            "Checkout could not be loaded. Return to your plan and try again shortly.",
          )}
        </p>
        <Link href="/account/plan">{t("Back to your plan")}</Link>
      </section>
    );
  }
  if (!checkout) notFound();

  return (
    <section className={styles.editor}>
      <Link href="/account/plan">{t("Back to your plan")}</Link>
      <h1>{t("Premium checkout")}</h1>
      <p className={styles.notice}>
        {t(
          "Sandbox · Use Paddle test payment details only. No real money is charged.",
        )}
      </p>
      <p>
        {plans[checkout.interval].display}
        {t(", including applicable tax. Renews automatically until canceled.")}
      </p>
      <PaddleCheckout
        transactionId={checkout.transactionId}
        clientToken={checkout.clientToken}
      />
      <p>
        {t(
          "After checkout, return to Your plan and select Refresh billing. Closing checkout or returning here does not confirm a payment.",
        )}
      </p>
    </section>
  );
}
