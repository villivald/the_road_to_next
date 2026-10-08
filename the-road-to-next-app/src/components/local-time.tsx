"use client";

import { useSyncExternalStore } from "react";

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
  const fallback = new Intl.DateTimeFormat("en-GB", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(value));
  const label = useSyncExternalStore(
    subscribe,
    () => new Intl.DateTimeFormat(undefined, options).format(new Date(value)),
    () => fallback,
  );

  return (
    <time dateTime={value} title={fallback}>
      {label}
    </time>
  );
}
