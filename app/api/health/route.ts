import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const health = {
    status: "ok",
    checks: {
      database: "unknown",
      redis: "unknown",
    },
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = "ok";
  } catch {
    health.checks.database = "error";
    health.status = "error";
  }

  // Check Redis connectivity
  try {
    await redis.ping();
    health.checks.redis = "ok";
  } catch {
    health.checks.redis = "error";
    health.status = "error";
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
