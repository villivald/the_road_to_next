"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function PlanRefresh({ changesAt }: { changesAt: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!changesAt) {
      return;
    }
    const timestamp = new Date(changesAt).getTime();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible" && Date.now() >= timestamp) {
        router.refresh();
      }
    };
    let timer: ReturnType<typeof setTimeout>;
    const scheduleRefresh = () => {
      const remaining = timestamp - Date.now() + 100;
      if (remaining <= 0) {
        router.refresh();
        return;
      }
      timer = setTimeout(scheduleRefresh, Math.min(2_147_483_647, remaining));
    };
    scheduleRefresh();
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [changesAt, router]);

  return null;
}
