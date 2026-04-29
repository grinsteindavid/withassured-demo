"use client";

// Thin fetch wrapper that implements the browser half of the
// double-submit CSRF pattern enforced by `lib/route-guard.ts`.
//
// On POST/PUT/PATCH/DELETE it reads the non-httpOnly `csrf-token`
// cookie (set by `setCsrfCookie()` on login) and forwards it as the
// `x-csrf-token` header. GET/HEAD are passed through unchanged.
//
// All client components that mutate server state MUST use this helper
// instead of calling `fetch` directly, otherwise the route guard will
// respond with 403 `Invalid or missing CSRF token`.

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const mutating = method !== "GET" && method !== "HEAD";

  // Pass-through when there is no CSRF token to attach. Preserves the
  // caller's `init` shape so test environments (no cookie) see the same
  // payload they'd see with plain `fetch`.
  if (!mutating) return fetch(input, init);
  const token = getCsrfToken();
  if (!token) return fetch(input, init);

  const headers = new Headers(init.headers);
  headers.set("x-csrf-token", token);
  return fetch(input, { ...init, headers });
}
