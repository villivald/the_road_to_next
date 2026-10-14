import { cookies } from "next/headers";
import { GUEST_COOKIE, guestHeaders } from "@/features/guest/http";
import { readGuestImage } from "@/features/guest/service/access";
import { readImageVariant } from "@/features/media/service/variants";
import { requestedImageWidth } from "@/features/media/variants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ listId: string; id: string }> },
) {
  const { listId, id } = await params;
  const width = requestedImageWidth(request);
  if (width === undefined) {
    return new Response(null, { status: 404, headers: guestHeaders });
  }
  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  const media = await readGuestImage(listId, id, token);
  if (!media) return new Response(null, { status: 404, headers: guestHeaders });
  try {
    const body = await readImageVariant(media, width);
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
