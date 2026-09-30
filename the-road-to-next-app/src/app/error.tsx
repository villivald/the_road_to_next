"use client";

import styles from "@/components/shell.module.css";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className={styles["account-panel"]}>
      <h1>Something went wrong</h1>
      <p>Please try again in a moment.</p>
      <button type="button" className={styles.button} onClick={reset}>
        Try again
      </button>
    </section>
  );
}
