"use client";

import { useEffect } from "react";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import { useRouter } from "@/i18n/navigation";
import { refreshBilling } from "../actions/manage-billing";

export function BillingRefresh() {
  const router = useRouter();

  useEffect(() => {
    let disposed = false;
    let checking = false;
    let checkedAt = 0;

    const check = async () => {
      if (
        disposed ||
        document.visibilityState !== "visible" ||
        checking ||
        Date.now() - checkedAt < 5000
      )
        return;
      checking = true;
      checkedAt = Date.now();
      try {
        const result = await refreshBilling(EMPTY_ACTION_STATE, new FormData());
        if (!disposed && result.status === "SUCCESS") router.refresh();
      } catch {
        // A provider outage must not prevent viewing the existing paid period.
      } finally {
        checking = false;
      }
    };

    void check();
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      disposed = true;
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [router]);

  return null;
}
