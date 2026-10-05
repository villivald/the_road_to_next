"use client";

import Script from "next/script";
import { useState } from "react";
import styles from "@/components/shell.module.css";

type PaddleClient = {
  Environment: { set: (environment: "sandbox") => void };
  Initialize: (options: {
    token: string;
    checkout: { settings: Record<string, unknown> };
  }) => void;
  Checkout: { open: (options: { transactionId: string }) => void };
};

let initializedToken: string | null = null;

export function PaddleCheckout({
  transactionId,
  clientToken,
}: {
  transactionId: string;
  clientToken: string;
}) {
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
              successUrl: `${window.location.origin}/account/plan?checkout=returned`,
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
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        onReady={prepare}
        onError={() => setFailed(true)}
      />
      {failed && (
        <p role="alert">
          Paddle checkout could not load. Reload this page to try again.
        </p>
      )}
      <button
        className={styles.button}
        disabled={!ready || failed}
        onClick={() => {
          try {
            paddle()?.Checkout.open({ transactionId });
          } catch {
            setFailed(true);
          }
        }}
      >
        {ready ? "Open secure checkout" : "Loading checkout…"}
      </button>
      <noscript>JavaScript is required for Paddle checkout.</noscript>
    </div>
  );
}
