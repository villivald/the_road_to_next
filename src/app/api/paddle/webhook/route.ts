import { acceptWebhook } from "@/features/billing/service/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400, headers });
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 262144) {
        await reader.cancel();
        return new Response(null, { status: 413, headers });
      }
      chunks.push(value);
    }
    const status = await acceptWebhook(
      Buffer.concat(chunks),
      request.headers.get("paddle-signature") ?? "",
    );
    return new Response(null, { status, headers });
  } catch (error) {
    return new Response(null, {
      status: error instanceof SyntaxError ? 400 : 503,
      headers,
    });
  } finally {
    reader.releaseLock();
  }
}
