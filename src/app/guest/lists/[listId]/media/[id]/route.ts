import { cookies } from "next/headers";
import { GUEST_COOKIE, guestHeaders } from "@/features/guest/http";
import { readGuestImage } from "@/features/guest/service/access";
import { mediaStorage } from "@/features/media/service/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ listId: string; id: string }> },
) {
  const { listId, id } = await params;
  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  const media = await readGuestImage(listId, id, token);
  if (!media) return new Response(null, { status: 404, headers: guestHeaders });
  try {
    const body = await mediaStorage.get(media.provider, media.pathname);
    if (!body || !(await readGuestImage(listId, id, token))) {
      if (body instanceof ReadableStream) await body.cancel();
      return new Response(null, { status: 404, headers: guestHeaders });
    }
    return new Response(body as BodyInit, {
      headers: { ...guestHeaders, "Content-Type": "image/webp" },
    });
  } catch {
    return new Response(null, { status: 503, headers: guestHeaders });
  }
}
