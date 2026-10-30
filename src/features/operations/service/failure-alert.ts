import { z } from "zod";
import { deliverRenderedEmail } from "@/lib/mail";

const jobs = {
  "wishlist-expire-auth-data": "Authentication record cleanup",
  "wishlist-cleanup-media": "Image cleanup",
  "wishlist-reconcile-paddle-billing": "Billing reconciliation",
  "wishlist-deliver-account-emails": "Account email delivery",
  "wishlist-deliver-list-invitations": "List invitation delivery",
} as const;

export const operationsFailureFilter = Object.keys(jobs)
  .map((id) => `event.data.function_id == '${id}'`)
  .join(" || ");

const failureSchema = z.object({
  function_id: z.enum(
    Object.keys(jobs) as [keyof typeof jobs, ...(keyof typeof jobs)[]],
  ),
  run_id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

export const sendOperationsFailureAlert = async (data: unknown) => {
  const configured = process.env.OPERATIONS_ALERT_EMAIL?.trim();
  if (!configured) return { sent: false, reason: "disabled" };
  const recipient = z.email().safeParse(configured);
  if (!recipient.success)
    throw new Error("Configure a valid operations alert address.");
  const result = failureSchema.safeParse(data);
  // Excluding every other function also prevents alerts about this alert handler.
  if (!result.success) return { sent: false, reason: "ignored" };
  const { function_id: functionId, run_id: runId } = result.data;
  const job = jobs[functionId];
  const text = `${job} exhausted its Inngest retries.\nRun: ${runId}\nOpen Inngest Production and inspect this run. Check saved work before replaying it.\nRepeated failures for this job are limited to one alert every four hours.\nCustomer data and error details are intentionally omitted.`;
  await deliverRenderedEmail(
    {
      to: recipient.data,
      subject: `Wishlist operations: ${job} failed`,
      text,
      html: `<p><strong>${job}</strong> exhausted its Inngest retries.</p><p>Run: <code>${runId}</code></p><p>Open Inngest Production and inspect this run. Check saved work before replaying it.</p><p>Repeated failures for this job are limited to one alert every four hours. Customer data and error details are intentionally omitted.</p>`,
    },
    `operations-failure/${functionId}/${runId}`,
  );
  return { sent: true };
};
