import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/auth";

const publicPaths = ["/login", "/api/auth"];

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function createUnauthorizedResponse(request: NextRequest) {
  if (isApiRoute(request.nextUrl.pathname)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; frame-ancestors 'self';",
  );
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  const token = request.cookies.get("session")?.value;

  if (!token) {
    const response = createUnauthorizedResponse(request);
    if (response.status === 401) {
      addSecurityHeaders(response);
    }
    return response;
  }

  const payload = await verifyJWT(token);

  if (!payload) {
    const response = createUnauthorizedResponse(request);
    if (response.status === 401) {
      addSecurityHeaders(response);
    }
    return response;
  }

  const requestId = crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set("x-user-id", payload.sub);
  response.headers.set("x-org-id", payload.orgId);
  response.headers.set("x-user-role", payload.role);
  response.headers.set("x-request-id", requestId);
  addSecurityHeaders(response);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.well-known/workflow/|api/cron/).*)",
  ],
};
