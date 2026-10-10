import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { SESSION_COOKIE_NAME } from "@/features/auth/utils/session-cookie";
import { guestHeaders } from "@/features/guest/http";
import { isLocale, localizedPath, withoutLocale } from "@/i18n/config";
import { routing } from "@/i18n/routing";
import { validateSession } from "@/lib/lucia";

const localize = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const path = withoutLocale(request.nextUrl.pathname);
  const guest = path === "/guest" || path.startsWith("/guest/");
  // Guest pages remain read-only, including localized and legacy URLs.
  if (guest && !["GET", "HEAD"].includes(request.method)) {
    return new NextResponse(null, {
      status: 405,
      headers: { ...guestHeaders, Allow: "GET, HEAD" },
    });
  }
  const headers = new Headers(request.headers);
  headers.delete("x-wishlist-view");
  if (guest) headers.set("x-wishlist-view", "guest");
  const forwarded = new NextRequest(request, { headers });
  let response: NextResponse;
  if (/^\/guest\/lists\/[^/]+\/media\//.test(path)) {
    const url = request.nextUrl.clone();
    url.pathname = path;
    response =
      path === request.nextUrl.pathname
        ? NextResponse.next({ request: { headers } })
        : NextResponse.rewrite(url, { request: { headers } });
  } else if (!/^\/(en|fi)(\/|$)/.test(request.nextUrl.pathname)) {
    let preference: unknown = request.cookies.get("wishlist-locale")?.value;
    if (!isLocale(preference)) {
      const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (token) preference = (await validateSession(token)).user?.locale;
    }
    if (isLocale(preference)) {
      const url = request.nextUrl.clone();
      url.pathname = localizedPath(path, preference);
      response = NextResponse.redirect(url);
    } else {
      response = localize(forwarded);
    }
  } else {
    response = localize(forwarded);
  }
  if (guest) {
    for (const [name, value] of Object.entries(guestHeaders)) {
      if (name !== "Vary") response.headers.set(name, value);
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
