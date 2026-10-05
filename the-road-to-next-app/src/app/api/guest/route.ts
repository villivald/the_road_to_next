import { cookies } from "next/headers";
import { limitSourceRequest } from "@/features/auth/service/request-limit";
import { AuthError } from "@/features/auth/service/security";
import { GUEST_COOKIE, guestHeaders } from "@/features/guest/http";
import { resolveGuestLink } from "@/features/guest/service/access";
import { guestTokenSchema } from "@/features/guest/service/schemas";
import { guestListPath } from "@/paths";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = process.env.APP_URL;
  if (!origin || request.headers.get("origin") !== new URL(origin).origin) {
    return new Response(null, { status: 403, headers: guestHeaders });
  }
  try {
    await limitSourceRequest("guest-open");
    // Plain token bodies are bounded without trusting Content-Length.
    const reader = request.body?.getReader();
    if (!reader)
      return new Response(null, { status: 400, headers: guestHeaders });
    let body = "";
    let received = 0;
    try {
      const decoder = new TextDecoder("utf-8", { fatal: true });
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > 64) {
          await reader.cancel();
          return new Response(null, { status: 400, headers: guestHeaders });
        }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
    } finally {
      reader.releaseLock();
    }
    const parsed = guestTokenSchema.safeParse(body);
    const link = parsed.success ? await resolveGuestLink(parsed.data) : null;
    if (!link || !parsed.success)
      return new Response(null, { status: 404, headers: guestHeaders });

    const destination = guestListPath(link.wishlistId);
    (await cookies()).set(GUEST_COOKIE, parsed.data, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: destination,
      expires: link.expiresAt,
    });
    return Response.json({ destination }, { headers: guestHeaders });
  } catch (error) {
    // Never log request bodies, cookies, or bearer tokens.
    return new Response(null, {
      status: error instanceof AuthError ? 429 : 503,
      headers: guestHeaders,
    });
  }
}
