import { NextResponse } from "next/server";
import { authenticateUser, signJWT, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
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

  return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
}
