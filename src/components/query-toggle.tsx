"use client";

import { useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import styles from "./shell.module.css";

export function QueryToggle({
  name,
  checked,
  label,
}: {
  name: string;
  checked: boolean;
  label: string;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticChecked, setOptimisticChecked] = useOptimistic(checked);
  return (
    <label className={styles["checkbox-label"]} aria-busy={pending}>
      <input
        type="checkbox"
        role="switch"
        checked={optimisticChecked}
        aria-disabled={pending}
        onChange={(event) => {
          if (pending) return;
          const nextChecked = event.target.checked;
          const query = new URLSearchParams(params);
          if (nextChecked) query.set(name, "1");
          else query.delete(name);
          query.delete("page");
          startTransition(() => {
            setOptimisticChecked(nextChecked);
            router.replace(`${pathname}?${query}`, { scroll: false });
          });
        }}
      />
      {label}
    </label>
  );
}
