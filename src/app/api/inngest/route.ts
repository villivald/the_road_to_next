import { serve } from "inngest/next";
import { authMaintenance } from "@/features/auth/events/maintenance";
import { billingMaintenance } from "@/features/billing/events/maintenance";
import { mediaMaintenance } from "@/features/media/events/maintenance";
import { invitationMaintenance } from "@/features/sharing/events/maintenance";
import { inngest } from "@/lib/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    authMaintenance,
    mediaMaintenance,
    invitationMaintenance,
    billingMaintenance,
  ],
});
