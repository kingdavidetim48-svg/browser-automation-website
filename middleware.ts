import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Allow all dashboard routes to render the Chapter 6 Dashboard Layout
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/test"],
};
