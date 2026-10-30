import { inngest } from "@/lib/inngest";
import {
  operationsFailureFilter,
  sendOperationsFailureAlert,
} from "../service/failure-alert";

export const operationsFailureAlert = inngest.createFunction(
  {
    id: "operations-failure-alert",
    triggers: [
      { event: "inngest/function.failed", if: operationsFailureFilter },
    ],
    retries: 3,
    rateLimit: { limit: 1, period: "4h", key: "event.data.function_id" },
  },
  ({ event, step }) =>
    step.run("notify-operator", () => sendOperationsFailureAlert(event.data)),
);
