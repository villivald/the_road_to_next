import { limitSourceRequest } from "@/features/auth/service/request-limit";
import { AuthError } from "@/features/auth/service/security";
import { GUEST_COOKIE, guestHeaders } from "@/features/guest/http";
import { resolveGuestLink } from "@/features/guest/service/access";
import { guestTokenSchema } from "@/features/guest/service/schemas";
import { localizedPath } from "@/i18n/config";
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
    const response = Response.json({ destination }, { headers: guestHeaders });
    for (const path of [
      destination,
      localizedPath(destination, "en"),
      localizedPath(destination, "fi"),
    ])
      // cookies().set replaces same-name entries even when their paths differ.
      // Append each scoped cookie explicitly so both languages and legacy media work.
      response.headers.append(
        "Set-Cookie",
        `${GUEST_COOKIE}=${parsed.data}; Path=${path}; Expires=${link.expiresAt.toUTCString()}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
      );
    return response;
  } catch (error) {
    // Never log request bodies, cookies, or bearer tokens.
    return new Response(null, {
      status: error instanceof AuthError ? 429 : 503,
      headers: guestHeaders,
    });
  }
}
