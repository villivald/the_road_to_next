import { inngest } from "@/lib/inngest";
import { reconcileBilling } from "../service/sync";

export const billingMaintenance = inngest.createFunction(
  { id: "reconcile-paddle-billing", triggers: [{ cron: "*/5 * * * *" }] },
  () => reconcileBilling(),
);
