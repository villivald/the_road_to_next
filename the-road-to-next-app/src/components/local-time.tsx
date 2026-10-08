"use client";

import { useLocale } from "next-intl";
import { useSyncExternalStore } from "react";
import { languageTag } from "@/i18n/config";

const subscribe = () => () => {};
const options: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short",
};

export function LocalTime({ value }: { value: string }) {
  const locale = languageTag(useLocale());
  const fallback = new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(new Date(value));
  const label = useSyncExternalStore(
    subscribe,
    () => new Intl.DateTimeFormat(locale, options).format(new Date(value)),
    () => fallback,
  );

  return (
    <time dateTime={value} title={fallback}>
      {label}
    </time>
  );
}
