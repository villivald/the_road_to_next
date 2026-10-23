import { z } from "zod";
import { backgroundEvents } from "@/lib/background-events";
import { inngest } from "@/lib/inngest";
import { billingEventIdSchema } from "../service/event-id";
import { reconcileBilling } from "../service/sync";

export const billingMaintenance = inngest.createFunction(
  {
    id: "reconcile-paddle-billing",
    triggers: [{ event: backgroundEvents.billing }, { cron: "*/15 * * * *" }],
    concurrency: 2,
  },
  ({ event, step }) =>
    step.run("reconcile", () =>
      reconcileBilling(
        event.name === "inngest/scheduled.timer"
          ? undefined
          : z.object({ id: billingEventIdSchema() }).parse(event.data).id,
      ),
    ),
);
