import { handlePaddleWebhook } from "@/features/billing/service/webhook-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = (request: Request) => handlePaddleWebhook(request, "live");
