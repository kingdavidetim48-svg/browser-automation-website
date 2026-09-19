import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  // Protected route pattern example: /dashboard
  const isProtected = request.nextUrl.pathname.startsWith("/dashboard");

  if (isProtected && !sessionCookie) {
    const url = new URL("/", request.url);
    url.searchParams.set("error", "unauthenticated");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
