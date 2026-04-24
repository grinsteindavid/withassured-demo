import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const enrollments = await prisma.payerEnrollment.findMany();
  return NextResponse.json(enrollments);
}
