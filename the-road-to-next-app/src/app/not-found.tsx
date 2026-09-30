import Link from "next/link";
import styles from "@/components/shell.module.css";

export default function NotFound() {
  return (
    <section className={styles["account-panel"]}>
      <h1>Page not found</h1>
      <p>This page is unavailable.</p>
      <Link href="/">Back to home</Link>
    </section>
  );
}
