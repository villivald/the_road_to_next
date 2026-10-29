"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import shell from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";
import styles from "./personalization.module.css";

// Mounted only after an explicit preview request. The existing endpoint checks
// manager access and Premium eligibility; private cards never enter a public cache.
export function PersonalSharingCard({
  href,
  title,
}: {
  href: string;
  title: string;
}) {
  const t = useText();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ url?: string; failed?: boolean }>({});
  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    void fetch(href, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (
          !response.ok ||
          !response.headers.get("Content-Type")?.startsWith("image/png")
        )
          throw Error("Unavailable");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setResult({ url });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ failed: true });
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [href, attempt]);

  if (result.failed)
    return (
      <div className={styles["download-body"]}>
        <p role="alert">
          {t("Card unavailable. Check your access and try again.")}
        </p>
        <button
          type="button"
          className={shell["secondary-button"]}
          onClick={() => {
            setResult({});
            setAttempt((value) => value + 1);
          }}
        >
          {t("Preview sharing card")}
        </button>
      </div>
    );

  return result.url ? (
    <Image
      className={styles["example-card"]}
      src={result.url}
      alt={t("Sharing card for {value0}", { value0: title })}
      width={1200}
      height={800}
      unoptimized
    />
  ) : (
    <div className={styles["card-preparing"]} role="status">
      {t("Preparing card…")}
    </div>
  );
}
