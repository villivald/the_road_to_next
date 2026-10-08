import type { Metadata } from "next";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { readPremiumAccess } from "@/features/premium/service/entitlements";
import { ListForm } from "@/features/wishlist/components/list-form";

export const metadata: Metadata = {
  title: "Create a list",
  robots: { index: false, follow: false },
};

export default async function NewListPage() {
  const { user } = await getAuthOrRedirect();
  const access = await readPremiumAccess(user.id);

  return (
    <section className={styles.editor}>
      <h1>Create a list</h1>
      <p className={styles.muted}>
        Give your list a name, then choose how you’d like to share it.
      </p>
      <ListForm canCreatePrivate={access.plan === "PREMIUM"} />
    </section>
  );
}
