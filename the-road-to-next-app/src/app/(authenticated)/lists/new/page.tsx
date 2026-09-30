import type { Metadata } from "next";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { ListForm } from "@/features/wishlist/components/list-form";

export const metadata: Metadata = {
  title: "Create a list",
  robots: { index: false, follow: false },
};

export default async function NewListPage() {
  await getAuthOrRedirect();

  return (
    <section className={styles.editor}>
      <h1>Create a list</h1>
      <p className={styles.muted}>
        Start with a draft. Your list is only visible to its admins until you
        publish it.
      </p>
      <ListForm />
    </section>
  );
}
