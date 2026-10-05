"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/components/shell.module.css";

export function OpenGuestLink() {
  const token = useRef<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    token.current ??= window.location.hash.slice(1);
    // The secret never becomes a query/path parameter, referrer, or history entry
    // after opening. No analytics or logging may be added to this exchange.
    window.history.replaceState(null, "", "/guest");
    const controller = new AbortController();
    const open = async () => {
      try {
        const response = await fetch("/api/guest", {
          method: "POST",
          body: token.current,
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unavailable");
        const { destination } = (await response.json()) as {
          destination: string;
        };
        if (!/^\/guest\/lists\/[a-zA-Z0-9_-]{1,128}$/.test(destination))
          throw new Error("Unavailable");
        if (!controller.signal.aborted) window.location.replace(destination);
      } catch {
        if (!controller.signal.aborted) setUnavailable(true);
      }
    };
    void open();

    // Reopening a link on this page can be a fragment-only navigation.
    const reopen = () => {
      if (window.location.hash !== "#main-content") window.location.reload();
    };
    window.addEventListener("hashchange", reopen);
    return () => {
      controller.abort();
      window.removeEventListener("hashchange", reopen);
    };
  }, []);

  return (
    <section className={styles.editor}>
      <h1>Guest link</h1>
      {unavailable ? (
        <p role="alert">
          This guest link is unavailable. It may have expired or been revoked.
          Ask a list admin for a new link, or reopen your original link to try
          again.
        </p>
      ) : (
        <p role="status">Opening the shared list…</p>
      )}
      <noscript>
        JavaScript is required to open this private guest link.
      </noscript>
    </section>
  );
}
