"use client";
import Script from "next/script";
import { useState } from "react";
import styles from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";

type PaddleClient = {
  Environment: { set: (environment: "sandbox") => void };
  Initialize: (options: {
    token: string;
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

export function PaddleCheckout({
  transactionId,
  clientToken,
}: {
  transactionId: string;
  clientToken: string;
}) {
  const t = useText();

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const paddle = () => (window as Window & { Paddle?: PaddleClient }).Paddle;

  const prepare = () => {
    try {
      const client = paddle();
      if (!client) throw new Error("Unavailable");
      if (initializedToken !== clientToken) {
        client.Environment.set("sandbox");
        client.Initialize({
          token: clientToken,
          checkout: {
            settings: {
              displayMode: "overlay",
              variant: "one-page",
              locale: "en",
              allowLogout: false,
              showAddDiscounts: false,
              successUrl: `${window.location.origin}/${t.locale}/account/plan?checkout=returned`,
            },
          },
        });
        initializedToken = clientToken;
      }
      setReady(true);
    } catch {
      setFailed(true);
    }
  };

  return (
    <div className={styles.form}>
      {t.locale === "fi" && (
        <p>{t("Paddle’s payment window opens in English.")}</p>
      )}
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        onReady={prepare}
        onError={() => setFailed(true)}
      />
      {failed && (
        <p role="alert">
          {t("Paddle checkout could not load. Reload this page to try again.")}
        </p>
      )}
      <button
        className={styles.button}
        disabled={!ready || failed}
        onClick={() => {
          try {
            paddle()?.Checkout.open({
              transactionId,
              settings: {
                locale: "en",
                successUrl: `${window.location.origin}/${t.locale}/account/plan?checkout=returned`,
              },
            });
          } catch {
            setFailed(true);
          }
        }}
      >
        {ready ? t("Open secure checkout") : t("Loading checkout…")}
      </button>
      <noscript>{t("JavaScript is required for Paddle checkout.")}</noscript>
    </div>
  );
}
