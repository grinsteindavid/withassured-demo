import { NextResponse } from "next/server";
import { listAllInvoices } from "@/lib/billing";

export async function GET() {
  return NextResponse.json(await listAllInvoices());
}
