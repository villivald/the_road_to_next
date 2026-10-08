import type { ReactNode } from "react";
import shell from "@/components/shell.module.css";
import styles from "./loading-preview.module.css";

function LoadingFrame({
  label,
  children,
  className = shell.page,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className} data-loading-preview>
      <p role="status" className={shell["visually-hidden"]}>
        {label}
      </p>
      <div aria-hidden="true" aria-busy="true" className={styles.content}>
        {children}
      </div>
    </section>
  );
}

function SkeletonCards({ media = true }: { media?: boolean }) {
  return (
    <div className={shell["list-grid"]}>
      {[0, 1, 2].map((index) => (
        <div key={index} className={shell["list-card"]}>
          {media && <div className={`${styles.block} ${styles.media}`} />}
          <div className={`${styles.block} ${styles.title}`} />
          <div className={`${styles.block} ${styles.line}`} />
          <div className={styles["card-actions"]}>
            <div className={`${styles.block} ${styles.button}`} />
            <div className={`${styles.block} ${styles.button}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonFields({ count = 2 }: { count?: number }) {
  return (
    <div className={shell.form}>
      {Array.from({ length: count }, (_unused, index) => (
        <div key={index} className={shell.field}>
          <div className={`${styles.block} ${styles.label}`} />
          <div
            className={`${styles.block} ${index === 1 ? styles.textarea : styles.input}`}
          />
        </div>
      ))}
      <div className={`${styles.block} ${styles.button}`} />
    </div>
  );
}

export function CatalogSkeleton({
  kind = "browse",
}: {
  kind?: "browse" | "lists" | "shared";
}) {
  const { heading, description } = {
    browse: {
      heading: "Browse wishlists",
      description:
        "Explore public lists, available wishes, and the people behind them.",
    },
    lists: { heading: "My lists", description: "Your wishes, in one place." },
    shared: {
      heading: "Lists shared with you",
      description: "Lists owned by other people that you have joined.",
    },
  }[kind];

  return (
    <LoadingFrame label={`Loading ${heading.toLowerCase()}…`}>
      {kind === "shared" && (
        <span className={styles["back-label"]}>Back to my lists</span>
      )}
      <div className={shell["page-heading"]}>
        <div>
          <h1>{heading}</h1>
          <p className={shell.muted}>{description}</p>
        </div>
        {kind === "lists" && (
          <div className={`${styles.block} ${styles.button}`} />
        )}
      </div>
      {kind === "browse" ? (
        <>
          <div className={`${styles.block} ${styles.tabs}`} />
          <div className={shell["filter-panel"]}>
            <div className={shell["form-row"]}>
              {[0, 1].map((index) => (
                <div className={shell.field} key={index}>
                  <div className={`${styles.block} ${styles.label}`} />
                  <div className={`${styles.block} ${styles.input}`} />
                </div>
              ))}
            </div>
            <div className={`${styles.block} ${styles.line}`} />
            <div className={`${styles.block} ${styles.button}`} />
          </div>
        </>
      ) : kind === "lists" ? (
        <div className={`${styles.block} ${styles["back-link"]}`} />
      ) : null}
      <SkeletonCards media={kind !== "shared"} />
    </LoadingFrame>
  );
}

export function DetailSkeleton({ kind = "list" }: { kind?: "list" | "wish" }) {
  return (
    <LoadingFrame label={`Loading ${kind === "list" ? "wishlist" : "wish"}…`}>
      <div className={`${styles.block} ${styles["back-link"]}`} />
      <div className={`${styles.block} ${styles.heading}`} />
      <div className={`${styles.block} ${styles.line}`} />
      {kind === "list" ? (
        <>
          <div className={`${styles.block} ${styles.toolbar}`} />
          <SkeletonCards />
        </>
      ) : (
        <>
          <div className={`${styles.block} ${styles["detail-media"]}`} />
          <div className={`${styles.block} ${styles.line}`} />
          <div className={shell["list-settings"]}>
            <div className={`${styles.block} ${styles.title}`} />
            <div className={`${styles.block} ${styles.line}`} />
            <div className={`${styles.block} ${styles.button}`} />
          </div>
        </>
      )}
    </LoadingFrame>
  );
}

export function EditorSkeleton({ profile = false }: { profile?: boolean }) {
  return (
    <LoadingFrame
      label={profile ? "Loading your profile…" : "Loading editor…"}
      className={profile ? shell["account-panel"] : shell.editor}
    >
      {profile ? (
        <h1>Your account</h1>
      ) : (
        <div className={`${styles.block} ${styles.heading}`} />
      )}
      {profile && (
        <>
          <div className={`${styles.block} ${styles["account-details"]}`} />
          <div className={`${styles.block} ${styles.toolbar}`} />
        </>
      )}
      <SkeletonFields count={profile ? 2 : 5} />
      {profile && (
        <>
          <div className={`${styles.block} ${styles["back-link"]}`} />
          <div className={styles["avatar-editor"]}>
            <div className={`${styles.block} ${styles.title}`} />
            <div className={`${styles.block} ${styles.line}`} />
            <SkeletonFields />
          </div>
          <div className={`${styles.block} ${styles["back-link"]}`} />
          <div className={`${styles.block} ${styles["back-link"]}`} />
        </>
      )}
    </LoadingFrame>
  );
}
