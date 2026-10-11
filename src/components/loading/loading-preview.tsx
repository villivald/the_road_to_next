import type { ReactNode } from "react";
import shell from "@/components/shell.module.css";
import {
  AccountDetails,
  type AccountIdentity,
} from "@/features/account/components/account-details";
import { ProfileForm } from "@/features/account/components/profile-form";
import { BrowseControls } from "@/features/discovery/components/discovery-controls";
import { parseDiscoveryQuery } from "@/features/discovery/service/query";
import { MyListsControls } from "@/features/wishlist/components/my-lists-controls";
import { useText } from "@/i18n/use-text";
import styles from "./loading-preview.module.css";

function LoadingFrame({
  label,
  children,
  className = shell.page,
  contentClassName,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={className} data-loading-preview>
      <p role="status" className={shell["visually-hidden"]}>
        {label}
      </p>
      <div
        aria-hidden="true"
        aria-busy="true"
        inert
        className={`${styles.content} ${contentClassName ?? ""}`}
      >
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
  const t = useText();

  const { heading, description } = {
    browse: {
      heading: t("Browse wishlists"),
      description: t(
        "Explore public lists, available wishes, and the people behind them.",
      ),
    },
    lists: {
      heading: t("My lists"),
      description: t("Your wishes, in one place."),
    },
    shared: {
      heading: t("Lists shared with you"),
      description: t("Lists owned by other people that you have joined."),
    },
  }[kind];

  return (
    <LoadingFrame
      label={t("Loading {value0}…", { value0: heading.toLowerCase() })}
    >
      {kind === "shared" && (
        <span className={styles["back-label"]}>{t("Back to my lists")}</span>
      )}
      {kind === "browse" ? (
        <BrowseControls filters={parseDiscoveryQuery({})} />
      ) : kind === "lists" ? (
        <MyListsControls />
      ) : (
        <div className={shell["page-heading"]}>
          <div>
            <h1>{heading}</h1>
            <p className={shell.muted}>{description}</p>
          </div>
        </div>
      )}
      <SkeletonCards media={kind !== "shared"} />
    </LoadingFrame>
  );
}

export function DetailSkeleton({ kind = "list" }: { kind?: "list" | "wish" }) {
  const t = useText();

  return (
    <LoadingFrame
      label={t("Loading {value0}…", {
        value0: kind === "list" ? t("Shared list") : t("Wish details"),
      })}
    >
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

export function EditorSkeleton({
  profile = false,
  user,
}: {
  profile?: boolean;
  user?: AccountIdentity;
}) {
  const t = useText();

  return (
    <LoadingFrame
      label={profile ? t("Loading your profile…") : t("Loading editor…")}
      className={profile ? shell["account-panel"] : shell.editor}
      contentClassName={profile ? styles["account-content"] : undefined}
    >
      {profile ? (
        <h1>{t("Your account")}</h1>
      ) : (
        <div className={`${styles.block} ${styles.heading}`} />
      )}
      {profile && user && <AccountDetails user={user} />}
      {profile ? (
        <ProfileForm profile={{ name: null, description: null }} loading />
      ) : (
        <SkeletonFields count={5} />
      )}
      {profile && (
        <>
          <div className={shell["plan-summary"]}>
            <div className={`${styles.block} ${styles.label}`} />
            <div className={`${styles.block} ${styles.title}`} />
            <div className={`${styles.block} ${styles.line}`} />
            <div className={`${styles.block} ${styles.button}`} />
          </div>
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
