import { NextResponse } from "next/server";
import { authenticateUser, signJWT, setSessionCookie, setCsrfCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { rateLimit, buildIdentifier, RateLimitUnavailableError } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
  try {
    const limitResult = await rateLimit(
      buildIdentifier({ bucket: "login", ip: clientIp }),
      60,
      60_000,
    );
    if (!limitResult.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
  } catch (err) {
    if (err instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limiter unavailable" }, { status: 503 });
    }
    throw err;
  }

  const body = await request.json();
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, password } = result.data;

  const user = await authenticateUser(email, password);

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signJWT({ sub: user.id, orgId: user.orgId, role: user.role });
  await setSessionCookie(token);
  await setCsrfCookie();

  return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
}
