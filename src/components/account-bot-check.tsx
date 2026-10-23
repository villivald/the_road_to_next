"use client";

import Script from "next/script";
import { useTheme } from "next-themes";
import { useEffect, useId, useRef, useState } from "react";
import type { AccountChallenge } from "@/features/auth/service/bot-protection";
import { useText } from "@/i18n/use-text";
import styles from "./shell.module.css";

type Turnstile = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      action: AccountChallenge;
      theme: "light" | "dark";
      language: string;
      size: "flexible" | "compact";
      "response-field": false;
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
      "timeout-callback": () => void;
    },
  ) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

function ChallengeWidget({
  action,
  siteKey,
  theme,
}: {
  action: AccountChallenge;
  siteKey: string;
  theme: "light" | "dark";
}) {
  const t = useText();
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [token, setToken] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const api = window.turnstile;
    if (!loaded || !container.current || !api) return;
    const element = container.current;
    let currentSize: "flexible" | "compact" | undefined;
    const fail = () => {
      setToken("");
      setFailed(true);
    };
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width <= 0) return;
      // Cloudflare's horizontal widget requires at least 300px. Re-render only
      // when crossing that threshold, not for every flexible-width adjustment.
      const size = entry.contentRect.width >= 300 ? "flexible" : "compact";
      if (size === currentSize) return;
      currentSize = size;
      if (widget.current !== undefined) api.remove(widget.current);
      setToken("");
      setFailed(false);
      widget.current = api.render(element, {
        sitekey: siteKey,
        action,
        theme,
        language: t.locale,
        size,
        "response-field": false,
        callback: (value) => {
          setToken(value);
          setFailed(false);
        },
        "error-callback": fail,
        "expired-callback": fail,
        "timeout-callback": fail,
      });
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (widget.current !== undefined) api.remove(widget.current);
      widget.current = undefined;
    };
  }, [action, loaded, siteKey, t.locale, theme]);

  return (
    <>
      <Script
        id="account-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
      <input type="hidden" name="cf-turnstile-response" value={token} />
      <div
        className={styles["account-challenge"]}
        role="group"
        aria-label={t("Security check")}
      >
        <div ref={container} className={styles["challenge-widget"]} />
        {failed && (
          <div role="status" className={styles.muted}>
            <p>{t("Security check unavailable or expired. Please retry.")}</p>
            <button
              type="button"
              className={styles["secondary-button"]}
              onClick={() => {
                setToken("");
                setFailed(false);
                if (widget.current !== undefined)
                  window.turnstile?.reset(widget.current);
                else window.location.reload();
              }}
            >
              {t("Retry security check")}
            </button>
          </div>
        )}
      </div>
      <noscript>
        <p className={styles.muted}>
          {t("Enable JavaScript to complete the security check.")}
        </p>
      </noscript>
    </>
  );
}

export function AccountBotCheck({
  action,
  attempt,
}: {
  action: AccountChallenge;
  attempt: number;
}) {
  const t = useText();
  const { resolvedTheme } = useTheme();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const id = useId();
  const theme = resolvedTheme === "dark" ? "dark" : "light";
  return (
    <>
      <div className={styles["visually-hidden"]} aria-hidden="true">
        <label htmlFor={id}>{t("Leave this field empty")}</label>
        <input
          id={id}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
      {siteKey && (
        <ChallengeWidget
          key={`${attempt}:${theme}:${t.locale}`}
          action={action}
          siteKey={siteKey}
          theme={theme}
        />
      )}
    </>
  );
}
