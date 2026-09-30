import type { Metadata } from "next";
import styles from "@/components/shell.module.css";
import { getMyLists } from "@/features/wishlist/queries/get-my-lists";

export const metadata: Metadata = {
  title: "My lists",
  robots: { index: false, follow: false },
};

export default async function ListsPage() {
  const lists = await getMyLists();
  return (
    <section className={styles.page}>
      <div>
        <h1>My lists</h1>
        <p className={styles.muted}>Your wishes, in one place.</p>
      </div>
      {lists.length ? (
        <ul className={styles["list-grid"]}>
          {lists.map((list) => (
            <li key={list.id} className={styles["list-card"]}>
              <h2>{list.title}</h2>
              <p className={styles.muted}>
                {list.publication === "DRAFT" ? "Draft" : "Published"} ·{" "}
                {list.visibility === "PRIVATE" ? "Private" : "Public"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles["empty-state"]}>
          <h2>No lists yet</h2>
          <p className={styles.muted}>Your wishlists will appear here.</p>
        </div>
      )}
    </section>
  );
}
