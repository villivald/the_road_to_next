"use client";

import { type ReactNode, useEffect, useState } from "react";
import styles from "@/components/shell.module.css";

// Clear expired content and refresh restored/backgrounded views. This cannot
// retract content someone already saw or saved; every new server read is checked.
export function GuestSession({
  expiresAt,
  children,
}: {
  expiresAt: string;
  children: ReactNode;
}) {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const timestamp = new Date(expiresAt).getTime();
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const remaining = timestamp - Date.now();
      if (remaining <= 0) {
        setExpired(true);
        return;
      }
      timer = setTimeout(schedule, Math.min(remaining + 100, 2147483647));
    };
    timer = setTimeout(schedule, 0);
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    const visible = () => {
      if (document.visibilityState === "visible") window.location.reload();
    };
    window.addEventListener("pageshow", restore);
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pageshow", restore);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [expiresAt]);
  return expired ? (
    <section className={styles.editor}>
      <h1>Guest link expired</h1>
      <p role="alert">Ask a list admin for a new link.</p>
    </section>
  ) : (
    children
  );
}
