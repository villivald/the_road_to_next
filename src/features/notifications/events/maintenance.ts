import { z } from "zod";
import { backgroundEvents } from "@/lib/background-events";
import { inngest } from "@/lib/inngest";
import { deliverAccountEmails } from "../service/delivery";

export const accountEmailMaintenance = inngest.createFunction(
  {
    id: "deliver-account-emails",
    triggers: [
      { event: backgroundEvents.accountEmail },
      { cron: "*/15 * * * *" },
    ],
    concurrency: 5,
  },
  ({ event, step }) =>
    step.run("deliver", () =>
      deliverAccountEmails(
        event.name === "inngest/scheduled.timer"
          ? undefined
          : z.object({ id: z.string().min(1).max(128) }).parse(event.data).id,
      ),
    ),
);
