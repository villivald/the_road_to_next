"use client";

import { useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import styles from "./shell.module.css";

const queryKey = (query: URLSearchParams) => {
  const sorted = new URLSearchParams(query);
  sorted.sort();
  return sorted.toString();
};

function restoreControls(form: HTMLFormElement | null, query: string) {
  if (!form) return;
  form.reset();
  const params = new URLSearchParams(query);
  for (const field of form.querySelectorAll<HTMLSelectElement>(
    "select[name]",
  )) {
    const value = params.get(field.name);
    // Unlike input defaults, React's select defaultValue is mount-only.
    field.value =
      Array.from(field.options).find((option) => option.value === value)
        ?.value ??
      field.options[0]?.value ??
      "";
  }
}

export function AutoFilterForm({
  action,
  className,
  label,
  children,
}: {
  action: string;
  className: string;
  label: string;
  children: ReactNode;
}) {
  const t = useText();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const currentQuery = queryKey(new URLSearchParams(params));
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composing = useRef(false);
  const submissions = useRef(new Set<string>());
  const latestSubmission = useRef<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (submissions.current.has(currentQuery)) {
      submissions.current.delete(currentQuery);
      if (currentQuery === latestSubmission.current) {
        submissions.current.clear();
        latestSubmission.current = null;
      }
      return;
    }
    // Back, pagination and Clear filters restore server defaults. Our own
    // responses must not overwrite text entered while a request was pending.
    if (timer.current) clearTimeout(timer.current);
    submissions.current.clear();
    latestSubmission.current = null;
    restoreControls(form.current, currentQuery);
  }, [currentQuery, pathname]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function applyFilters() {
    if (timer.current) clearTimeout(timer.current);
    if (!form.current || composing.current) return;
    const query = new URLSearchParams();
    for (const [name, value] of new FormData(form.current)) {
      if (typeof value === "string" && value && name !== "page") {
        query.set(name, value);
      }
    }
    const key = queryKey(query);
    if (
      key === queryKey(new URLSearchParams(window.location.search)) &&
      latestSubmission.current === null
    )
      return;
    submissions.current.add(key);
    latestSubmission.current = key;
    startTransition(() => {
      router.replace(`${pathname}?${query}`, { scroll: false });
    });
  }

  function scheduleFilters() {
    if (timer.current) clearTimeout(timer.current);
    if (!composing.current) timer.current = setTimeout(applyFilters, 350);
  }

  return (
    <form
      ref={form}
      action={action}
      method="get"
      className={className}
      aria-label={label}
      onClick={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest("a[data-reset-filters]") &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          if (timer.current) clearTimeout(timer.current);
          restoreControls(form.current, currentQuery);
        }
      }}
      onSubmit={(event) => {
        event.preventDefault();
        applyFilters();
      }}
      onChange={(event) => {
        const target = event.target;
        if (
          target instanceof HTMLSelectElement ||
          (target instanceof HTMLInputElement && target.type === "checkbox")
        ) {
          applyFilters();
        } else {
          scheduleFilters();
        }
      }}
      onCompositionStart={() => {
        composing.current = true;
        if (timer.current) clearTimeout(timer.current);
      }}
      onCompositionEnd={() => {
        composing.current = false;
        scheduleFilters();
      }}
    >
      {children}
      <span
        aria-live="polite"
        aria-atomic="true"
        className={styles["visually-hidden"]}
      >
        {pending ? t("Updating…") : ""}
      </span>
      <noscript>
        <button type="submit" className={styles["secondary-button"]}>
          {t("Apply")}
        </button>
      </noscript>
    </form>
  );
}
