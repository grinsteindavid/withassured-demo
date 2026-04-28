import { NextResponse } from "next/server";
import { clearSessionCookie, clearCsrfCookie } from "@/lib/auth";

export async function POST() {
  await clearSessionCookie();
  await clearCsrfCookie();
  return NextResponse.json({ success: true });
}
