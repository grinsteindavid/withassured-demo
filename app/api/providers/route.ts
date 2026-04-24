import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createProviderSchema } from "@/lib/validators";

export async function GET() {
  const providers = await prisma.provider.findMany();
  return NextResponse.json(providers);
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = createProviderSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const provider = await prisma.provider.create({
    data: result.data,
  });

  return NextResponse.json(provider, { status: 201 });
}
