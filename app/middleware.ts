import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authCookie = request.cookies.get("civilmanager_auth");
  const user = authCookie ? JSON.parse(authCookie.value) : null;

  const isPMRoute = pathname.startsWith("/pm");
  const isSupervisorRoute = pathname.startsWith("/supervisor");
  const isLoginRoute = pathname.startsWith("/login");

  if (isLoginRoute) {
    if (user) {
      const redirectTo = user.role === "pm" ? "/pm" : "/supervisor";
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    return NextResponse.next();
  }

  if (isPMRoute || isSupervisorRoute) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isPMRoute && user.role !== "pm") {
      return NextResponse.redirect(new URL("/supervisor", request.url));
    }

    if (isSupervisorRoute && user.role !== "supervisor") {
      return NextResponse.redirect(new URL("/pm", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pm/:path*", "/supervisor/:path*", "/login"],
};