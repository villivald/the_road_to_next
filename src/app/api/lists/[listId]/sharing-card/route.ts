import { getAuth } from "@/features/auth/actions/get-auth";
import { AuthError, consumeRateLimit } from "@/features/auth/service/security";
import { readSharingCard } from "@/features/premium/service/sharing-card";
import { isLocale } from "@/i18n/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
  Vary: "Cookie",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  const { user, session } = await getAuth();
  const { listId } = await params;
  const locale = new URL(request.url).searchParams.get("locale") ?? "en";
  if (!user?.emailVerified || !session || !isLocale(locale))
    return new Response(null, { status: 404, headers: privateHeaders });
  try {
    const list = await readSharingCard(user.id, session.id, listId);
    if (!list)
      return new Response(null, { status: 404, headers: privateHeaders });
    await consumeRateLimit("sharing-card", user.id, 20, 3600000);
    // Load rendering and QR code dependencies only for an authorized download.
    const { renderSharingCard } =
      await import("@/features/premium/service/render-sharing-card");
    const image = await renderSharingCard(list, locale);
    const current = await readSharingCard(user.id, session.id, listId);
    if (!current || JSON.stringify(current) !== JSON.stringify(list))
      return new Response(null, { status: 404, headers: privateHeaders });
    return new Response(new Uint8Array(image), {
      headers: {
        ...privateHeaders,
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="wishlist-card.png"',
      },
    });
  } catch (error) {
    return new Response(null, {
      status: error instanceof AuthError ? 429 : 503,
      headers: privateHeaders,
    });
  }
}
