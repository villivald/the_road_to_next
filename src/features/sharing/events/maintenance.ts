import { inngest } from "@/lib/inngest";
import { deliverInvitations } from "../service/delivery";

export const invitationMaintenance = inngest.createFunction(
  { id: "deliver-list-invitations", triggers: [{ cron: "*/5 * * * *" }] },
  () => deliverInvitations(),
);
