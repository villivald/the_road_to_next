import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/shell.module.css";
import { getMyLists } from "@/features/wishlist/queries/get-my-lists";
import { listPath, listsPath, newListPath } from "@/paths";

export const metadata: Metadata = {
  title: "My lists",
  robots: { index: false, follow: false },
};

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; deleted?: string }>;
}) {
  const params = await searchParams;
  const { lists, page, hasNextPage } = await getMyLists(
    Number(params.page ?? 1),
  );

  return (
    <section className={styles.page}>
      <div className={styles["page-heading"]}>
        <div>
          <h1>My lists</h1>
          <p className={styles.muted}>Your wishes, in one place.</p>
        </div>
        <Link href={newListPath} className={styles.button}>
          Create a list
        </Link>
      </div>

      {params.deleted === "1" && (
        <p role="status" className={styles.notice}>
          List deleted.
        </p>
      )}

      {lists.length ? (
        <ul className={styles["list-grid"]}>
          {lists.map((list) => (
            <li key={list.id} className={styles["list-card"]}>
              <h2>
                <Link href={listPath(list.id)}>{list.title}</Link>
              </h2>
              <p className={styles.muted}>
                {list.publication === "DRAFT" ? "Draft" : "Published"} ·{" "}
                {list.visibility === "PRIVATE" ? "Private" : "Public"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles["empty-state"]}>
          <h2>{page === 1 ? "No lists yet" : "No more lists"}</h2>
          <p className={styles.muted}>
            {page === 1
              ? "Create your first list and make it your own."
              : "Return to an earlier page to find your lists."}
          </p>
        </div>
      )}

      {(page > 1 || hasNextPage) && (
        <nav className={styles.actions} aria-label="List pages">
          {page > 1 && (
            <Link href={`${listsPath}?page=${page - 1}`}>Previous page</Link>
          )}
          <span>Page {page}</span>
          {hasNextPage && (
            <Link href={`${listsPath}?page=${page + 1}`}>Next page</Link>
          )}
        </nav>
      )}
    </section>
  );
}
