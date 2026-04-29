import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { requireActiveSubscription, subscriptionBlockedResponse } from "@/lib/subscription-guard";
import { rateLimit, buildIdentifier, RateLimitUnavailableError } from "@/lib/rate-limit";

const DEFAULT_RATE_LIMIT_MAX = 30;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;

export interface RateLimitOptions {
  bucket: string;
  max?: number;
  windowMs?: number;
}

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for") ?? "unknown";
}

function rateLimitUnavailableResponse(): NextResponse {
  return NextResponse.json({ error: "Rate limiter unavailable" }, { status: 503 });
}

function rateLimitExceededResponse(): NextResponse {
  return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
}

async function enforceRateLimit(
  request: NextRequest,
  options: RateLimitOptions,
  user: { userId: string } | null,
): Promise<NextResponse | null> {
  const identifier = buildIdentifier({
    bucket: options.bucket,
    userId: user?.userId,
    ip: clientIp(request),
  });
  try {
    const result = await rateLimit(
      identifier,
      options.max ?? DEFAULT_RATE_LIMIT_MAX,
      options.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS,
    );
    if (!result.allowed) return rateLimitExceededResponse();
    return null;
  } catch (err) {
    if (err instanceof RateLimitUnavailableError) return rateLimitUnavailableResponse();
    throw err;
  }
}

export type AuthenticatedHandler = (
  req: NextRequest,
  user: { userId: string; orgId: string; role: string },
) => Promise<Response> | Response;

export type AuthenticatedParamsHandler = (
  req: NextRequest,
  params: Promise<Record<string, string | string[]>>,
  user: { userId: string; orgId: string; role: string },
) => Promise<Response> | Response;

function csrfErrorResponse(): NextResponse {
  return NextResponse.json({ error: "Invalid or missing CSRF token" }, { status: 403 });
}

function methodAllowsBody(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

async function validateCsrfToken(request: NextRequest): Promise<boolean> {
  if (!methodAllowsBody(request.method)) {
    return true;
  }
  const cookieToken = request.cookies.get("csrf-token")?.value;
  const headerToken = request.headers.get("x-csrf-token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return false;
  }
  return true;
}

export function withAuth(
  handler: AuthenticatedHandler,
  options?: { csrf?: boolean; rateLimit?: RateLimitOptions },
) {
  return async (request: NextRequest): Promise<Response> => {
    if (options?.csrf !== false) {
      const valid = await validateCsrfToken(request);
      if (!valid) {
        return csrfErrorResponse();
      }
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await enforceRateLimit(request, options?.rateLimit ?? { bucket: "api" }, user);
    if (limited) return limited;

    return handler(request, user);
  };
}

export function withSubscription(handler: AuthenticatedHandler, options?: { csrf?: boolean }) {
  return withAuth(
    async (request: NextRequest, user: { userId: string; orgId: string; role: string }) => {
      const hasSubscription = await requireActiveSubscription(user.orgId);
      if (!hasSubscription) {
        return subscriptionBlockedResponse();
      }
      return handler(request, user);
    },
    { csrf: options?.csrf },
  );
}

export function withRole(
  handler: AuthenticatedHandler,
  allowedRoles: string[],
  options?: { csrf?: boolean; requireSubscription?: boolean },
) {
  const roleGuard: AuthenticatedHandler = async (
    request: NextRequest,
    user: { userId: string; orgId: string; role: string },
  ) => {
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (options?.requireSubscription) {
      const hasSubscription = await requireActiveSubscription(user.orgId);
      if (!hasSubscription) {
        return subscriptionBlockedResponse();
      }
    }

    return handler(request, user);
  };

  return withAuth(roleGuard, { csrf: options?.csrf });
}

export function withAuthParams(
  handler: AuthenticatedParamsHandler,
  options?: { csrf?: boolean; rateLimit?: RateLimitOptions },
) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<Record<string, string | string[]>> },
  ): Promise<Response> => {
    if (options?.csrf !== false) {
      const valid = await validateCsrfToken(request);
      if (!valid) {
        return csrfErrorResponse();
      }
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await enforceRateLimit(request, options?.rateLimit ?? { bucket: "api" }, user);
    if (limited) return limited;

    return handler(request, params, user);
  };
}

export function withSubscriptionParams(
  handler: AuthenticatedParamsHandler,
  options?: { csrf?: boolean },
) {
  return withAuthParams(
    async (
      request: NextRequest,
      params: Promise<Record<string, string | string[]>>,
      user: { userId: string; orgId: string; role: string },
    ) => {
      const hasSubscription = await requireActiveSubscription(user.orgId);
      if (!hasSubscription) {
        return subscriptionBlockedResponse();
      }
      return handler(request, params, user);
    },
    { csrf: options?.csrf },
  );
}

export function withRoleParams(
  handler: AuthenticatedParamsHandler,
  allowedRoles: string[],
  options?: { csrf?: boolean; requireSubscription?: boolean },
) {
  const roleGuard: AuthenticatedParamsHandler = async (
    request: NextRequest,
    params: Promise<Record<string, string | string[]>>,
    user: { userId: string; orgId: string; role: string },
  ) => {
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (options?.requireSubscription) {
      const hasSubscription = await requireActiveSubscription(user.orgId);
      if (!hasSubscription) {
        return subscriptionBlockedResponse();
      }
    }

    return handler(request, params, user);
  };

  return withAuthParams(roleGuard, { csrf: options?.csrf });
}
