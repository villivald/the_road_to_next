import { NextRequest, NextResponse } from "next/server";
import { guestHeaders } from "@/features/guest/http";

export function proxy(request: NextRequest) {
  // Stop Server Action replays on guest pages, even for authenticated admins.
  if (!["GET", "HEAD"].includes(request.method)) {
    return new NextResponse(null, {
      status: 405,
      headers: { ...guestHeaders, Allow: "GET, HEAD" },
    });
  }
  const headers = new Headers(request.headers);
  headers.set("x-wishlist-view", "guest");
  const response = NextResponse.next({ request: { headers } });
  for (const [name, value] of Object.entries(guestHeaders)) {
    if (name !== "Vary") response.headers.set(name, value);
  }
  return response;
}

export const config = { matcher: ["/guest/:path*"] };
