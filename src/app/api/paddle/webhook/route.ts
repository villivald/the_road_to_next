import { handlePaddleWebhook } from "@/features/billing/service/webhook-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Preserve the existing sandbox destination during the live transition.
export const POST = (request: Request) =>
  handlePaddleWebhook(request, "sandbox");
