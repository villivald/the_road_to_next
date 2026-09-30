import styles from "@/components/shell.module.css";

export default function Loading() {
  return (
    <p role="status" className={styles.notice}>
      Loading wishlist…
    </p>
  );
}
