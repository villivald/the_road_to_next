"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./cards.module.css";

export function CopyLink({ path, title }: { path: string; title: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (status !== "copied") return;
    const timer = window.setTimeout(() => setStatus("idle"), 3000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        new URL(path, window.location.origin).href,
      );
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <div className={styles["copy-control"]}>
      <button
        type="button"
        className={styles["icon-action"]}
        onClick={copy}
        aria-label={`Copy link to ${title}`}
        title="Copy link"
      >
        {status === "copied" ? (
          <Check size={18} aria-hidden="true" />
        ) : (
          <Copy size={18} aria-hidden="true" />
        )}
      </button>
      <span
        role={status === "idle" ? undefined : "status"}
        className={styles["copy-status"]}
      >
        {status === "copied"
          ? "Link copied"
          : status === "failed"
            ? "Copy unavailable. Open this item and copy its address."
            : ""}
      </span>
    </div>
  );
}
