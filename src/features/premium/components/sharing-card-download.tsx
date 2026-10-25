"use client";

import { Download, QrCode, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import shell from "@/components/shell.module.css";
import { Link } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import { ListTheme } from "./list-theme";
import styles from "./personalization.module.css";

export function SharingCardDownload({
  listId,
  title,
  theme,
  premium,
  published,
  privateList,
  modal = false,
}: {
  listId: string;
  title: string;
  theme: string;
  premium: boolean;
  published: boolean;
  privateList: boolean;
  modal?: boolean;
}) {
  const t = useText();
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "failed">(
    "idle",
  );
  const href = `/api/lists/${encodeURIComponent(listId)}/sharing-card?locale=${t.locale}`;
  const content = (
    <div className={styles["download-body"]}>
      <p>
        {t(
          "Download an image of your list title with a QR code. Send it in a message or print it to share your list.",
        )}
      </p>
      <div className={styles["download-preview"]}>
        <ListTheme theme={theme} compact>
          <span className={styles.kicker}>{t("Wishlist preview")}</span>
          <strong className={styles["preview-title"]}>{title}</strong>
        </ListTheme>
      </div>
      <p className={styles.format}>
        {t("PNG image · 1200 × 800 pixels · QR code included")}
      </p>
      <p className={shell.muted}>
        {privateList
          ? t(
              "The card includes your private list title. Share it only with people you trust. Its QR code requires existing list access; it does not grant guest access.",
            )
          : t(
              "The QR code opens your public list. The card never includes wishes or reservations.",
            )}
      </p>
      {!published ? (
        <p className={shell.notice}>
          {t("Show your list before downloading a sharing card.")}
        </p>
      ) : !premium ? (
        <p>
          {t("The list owner needs Premium to download sharing cards.")}{" "}
          <Link href="/premium">{t("Explore Premium")}</Link>
        </p>
      ) : (
        <a
          className={shell.button}
          href={href}
          download="wishlist-card.png"
          aria-disabled={status === "loading"}
          onClick={async (event) => {
            event.preventDefault();
            if (status === "loading") return;
            setStatus("loading");
            try {
              const response = await fetch(href, { cache: "no-store" });
              if (
                !response.ok ||
                !response.headers.get("Content-Type")?.startsWith("image/png")
              )
                throw Error("Unavailable");
              const url = URL.createObjectURL(await response.blob());
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = "wishlist-card.png";
              document.body.append(anchor);
              anchor.click();
              anchor.remove();
              window.setTimeout(() => URL.revokeObjectURL(url), 1000);
              setStatus("done");
            } catch {
              setStatus("failed");
            }
          }}
        >
          <Download size={18} aria-hidden="true" />
          {status === "loading"
            ? t("Preparing card…")
            : t("Download sharing card")}
        </a>
      )}
      {status !== "idle" && (
        <p role="status">
          {status === "loading"
            ? t("Preparing card…")
            : status === "done"
              ? t("Card downloaded.")
              : t("Card unavailable. Check your access and try again.")}
        </p>
      )}
    </div>
  );
  if (!modal)
    return (
      <section className={styles.download} aria-labelledby={id}>
        <h2 id={id}>{t("Download a QR sharing card")}</h2>
        {content}
      </section>
    );
  return (
    <>
      <button
        ref={trigger}
        className={shell["secondary-button"]}
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <QrCode size={18} aria-hidden="true" />
        {t("Sharing card")}
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={id}
        onClose={() => trigger.current?.focus()}
      >
        <header className={styles["dialog-heading"]}>
          <h2 id={id}>{t("Download a QR sharing card")}</h2>
          <button
            type="button"
            className={styles.close}
            aria-label={t("Close sharing card")}
            onClick={() => dialog.current?.close()}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        {content}
      </dialog>
      <noscript>
        <Link href={`/lists/${listId}/edit#sharing-card`}>
          {t("Download a QR sharing card")}
        </Link>
      </noscript>
    </>
  );
}
