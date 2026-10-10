"use client";

import { ChevronDown, Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import styles from "@/components/shell.module.css";
import { type Locale, localizedPath } from "./config";
import { FORM_SAVED_EVENT } from "./form-changes";
import { useText } from "./use-text";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useText();
  const dirty = useRef(new Set<HTMLFormElement>());
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const changed = (event: Event) => {
      const element = event.target;
      if (element instanceof HTMLElement) {
        const form = element.closest("form");
        if (form) dirty.current.add(form);
      }
    };
    const saved = (event: Event) => {
      if (event.target instanceof HTMLFormElement)
        dirty.current.delete(event.target);
    };
    document.addEventListener("input", changed, true);
    document.addEventListener("change", changed, true);
    document.addEventListener(FORM_SAVED_EVENT, saved, true);
    return () => {
      document.removeEventListener("input", changed, true);
      document.removeEventListener("change", changed, true);
      document.removeEventListener(FORM_SAVED_EVENT, saved, true);
    };
  }, []);

  const switchLanguage = async (nextLocale: Locale) => {
    if (nextLocale === locale) return;
    const hasChanges = [...dirty.current].some((form) => form.isConnected);
    if (
      hasChanges &&
      !window.confirm(
        t("You have unsaved changes. Switch language and discard them?"),
      )
    )
      return;
    setPending(true);
    setFailed(false);
    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        body: nextLocale,
      });
      if (!response.ok) throw new Error("Language preference unavailable");
      window.location.assign(
        localizedPath(
          `${window.location.pathname}${window.location.search}${window.location.hash}`,
          nextLocale,
        ),
      );
    } catch {
      setPending(false);
      setFailed(true);
    }
  };

  return (
    <div className={styles["language-switcher"]}>
      <label className={styles["visually-hidden"]} htmlFor="language-select">
        {t("Language")}
      </label>
      <div className={styles["language-control"]}>
        <Languages
          className={styles["language-icon"]}
          size={16}
          aria-hidden="true"
        />
        <select
          id="language-select"
          value={locale}
          disabled={pending}
          onChange={(event) => {
            const nextLocale = event.currentTarget.value as Locale;
            event.currentTarget.value = locale;
            void switchLanguage(nextLocale);
          }}
        >
          <option value="en" lang="en">
            English
          </option>
          <option value="fi" lang="fi">
            Suomi
          </option>
        </select>
        <ChevronDown
          className={styles["language-chevron"]}
          size={14}
          aria-hidden="true"
        />
      </div>
      {failed && (
        <span role="alert">{t("Could not switch language. Try again.")}</span>
      )}
    </div>
  );
}
