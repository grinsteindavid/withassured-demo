import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const invoices = await prisma.invoice.findMany();
  return NextResponse.json(invoices);
}
