"use client";

import { CreditCard, RefreshCw } from "lucide-react";
import Script from "next/script";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import styles from "@/components/shell.module.css";
import { Link, useRouter } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";

type PaddleEvent = {
  name: string;
  data?: { transaction_id?: string; status?: string };
};
type PaddleClient = {
  Environment: { set: (environment: "sandbox") => void };
  Initialize: (options: {
    token: string;
    eventCallback: (event: PaddleEvent) => void;
    checkout: { settings: Record<string, unknown> };
  }) => void;
  Checkout: {
    open: (options: {
      transactionId: string;
      settings: Record<string, unknown>;
    }) => void;
  };
};

let initializedToken: string | null = null;
const listeners = new Set<(event: PaddleEvent) => void>();

export function PaddleCheckout({
  transactionId,
  clientToken,
}: {
  transactionId: string;
  clientToken: string;
}) {
  const t = useText();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [phase, setPhase] = useState<
    "idle" | "open" | "closed" | "error" | "processing"
  >("idle");
  const paymentAttempted = useRef(false);
  const paddle = () => (window as Window & { Paddle?: PaddleClient }).Paddle;

  useEffect(() => {
    const onEvent = (event: PaddleEvent) => {
      if (
        event.data?.transaction_id &&
        event.data.transaction_id !== transactionId
      )
        return;
      if (event.name === "checkout.completed") {
        setPhase("processing");
        router.replace("/account/plan?checkout=returned");
      } else if (event.name === "checkout.payment.initiated") {
        paymentAttempted.current = true;
        setPhase("processing");
      } else if (event.name === "checkout.closed") {
        setPhase("closed");
        if (
          paymentAttempted.current ||
          ["paid", "completed"].includes(event.data?.status ?? "")
        ) {
          router.replace("/account/plan?checkout=returned");
        }
      } else if (event.name === "checkout.error") {
        setPhase("error");
      } else if (
        ["checkout.payment.failed", "checkout.payment.error"].includes(
          event.name,
        )
      ) {
        paymentAttempted.current = false;
        setPhase("open");
      }
    };
    listeners.add(onEvent);
    return () => {
      listeners.delete(onEvent);
    };
  }, [transactionId, router]);

  const prepare = () => {
    try {
      const client = paddle();
      if (!client) throw new Error("Unavailable");
      if (initializedToken !== clientToken) {
        client.Environment.set("sandbox");
        client.Initialize({
          token: clientToken,
          eventCallback: (event) =>
            listeners.forEach((listener) => listener(event)),
          checkout: {
            settings: {
              displayMode: "overlay",
              variant: "one-page",
              locale: "en",
              allowLogout: false,
              showAddDiscounts: false,
            },
          },
        });
        initializedToken = clientToken;
      }
      setReady(true);
    } catch {
      setLoadFailed(true);
    }
  };

  return (
    <div className={styles.form}>
      {t.locale === "fi" && (
        <p className={styles.muted}>
          {t("Paddle’s payment window opens in English.")}
        </p>
      )}
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        onReady={prepare}
        onError={() => setLoadFailed(true)}
      />
      {loadFailed ? (
        <>
          <p role="alert" className={styles.error}>
            {t(
              "Paddle checkout could not load. Reload this page to try again.",
            )}
          </p>
          <button
            className={styles["secondary-button"]}
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={18} aria-hidden="true" />
            {t("Reload checkout")}
          </button>
        </>
      ) : (
        <button
          className={styles.button}
          disabled={!ready || phase === "open" || phase === "processing"}
          onClick={() => {
            try {
              const client = paddle();
              if (!client) throw new Error("Unavailable");
              paymentAttempted.current = false;
              setPhase("open");
              client.Checkout.open({
                transactionId,
                settings: {
                  locale: "en",
                  theme: resolvedTheme === "dark" ? "dark" : "light",
                  successUrl: `${window.location.origin}/${t.locale}/account/plan?checkout=returned`,
                },
              });
            } catch {
              setPhase("error");
            }
          }}
        >
          <CreditCard size={18} aria-hidden="true" />
          {!ready
            ? t("Loading checkout…")
            : phase === "open"
              ? t("Payment window open")
              : phase === "processing"
                ? t("Confirming payment…")
                : t("Open secure checkout")}
        </button>
      )}
      {phase === "closed" && (
        <p role="status">
          {t(
            "Payment window closed. You can reopen the same checkout or return to your plan.",
          )}
        </p>
      )}
      {phase === "error" && (
        <p role="alert" className={styles.error}>
          {t(
            "The payment window could not open. Try again, or return to your plan to check the payment status.",
          )}
        </p>
      )}
      <Link href="/account/plan?checkout=returned">
        {t("Check payment status")}
      </Link>
      <noscript>{t("JavaScript is required for Paddle checkout.")}</noscript>
    </div>
  );
}
