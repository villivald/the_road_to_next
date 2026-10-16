import { inngest } from "@/lib/inngest";
import { deliverAccountEmails } from "../service/delivery";

export const accountEmailMaintenance = inngest.createFunction(
  { id: "deliver-account-emails", triggers: [{ cron: "*/5 * * * *" }] },
  () => deliverAccountEmails(),
);
