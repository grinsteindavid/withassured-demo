import { NextResponse } from "next/server";
import { getProviders, createProvider } from "@/lib/providers";
import { createProviderSchema } from "@/lib/validators";

export async function GET() {
  const providers = await getProviders();
  return NextResponse.json(providers);
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = createProviderSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const provider = await createProvider(result.data);
  return NextResponse.json(provider, { status: 201 });
}
