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

export function LocalTime({
  value,
  dateOnly = false,
}: {
  value: string;
  dateOnly?: boolean;
}) {
  const locale = languageTag(useLocale());
  const displayOptions: Intl.DateTimeFormatOptions = dateOnly
    ? { year: "numeric", month: "short", day: "numeric" }
    : options;
  const fallback = new Intl.DateTimeFormat(locale, {
    ...displayOptions,
    timeZone: "UTC",
  }).format(new Date(value));
  const label = useSyncExternalStore(
    subscribe,
    () =>
      new Intl.DateTimeFormat(locale, displayOptions).format(new Date(value)),
    () => fallback,
  );

  return (
    <time
      dateTime={value}
      title={new Intl.DateTimeFormat(locale, {
        ...options,
        timeZone: "UTC",
      }).format(new Date(value))}
    >
      {label}
    </time>
  );
}
