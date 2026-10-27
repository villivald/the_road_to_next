"use client";

import { CircleCheck } from "lucide-react";
import { useEffect } from "react";
import styles from "./feedback.module.css";
import { useSaveConfirmation } from "./feedback-provider";

export function SuccessMessage({
  children,
  queryKeys,
}: {
  children: string;
  queryKeys: readonly string[];
}) {
  const notify = useSaveConfirmation();
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!queryKeys.some((key) => url.searchParams.has(key))) return;
    notify(children);
    queryKeys.forEach((key) => url.searchParams.delete(key));
    // Next's native-history integration preserves and updates its router state.
    window.history.replaceState(null, "", url.href);
  }, [children, queryKeys, notify]);
  return (
    <noscript>
      <div role="status" className={styles.success}>
        <CircleCheck size={21} aria-hidden="true" />
        <div>{children}</div>
      </div>
    </noscript>
  );
}
