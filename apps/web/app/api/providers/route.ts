import { NextResponse } from "next/server";
import { listProviders, createProviderWithLicenseAndCredentialing } from "@/lib/providers";
import { createProviderSchema, providerQuerySchema } from "@/lib/validators";
import { withSubscription } from "@/lib/route-guard";

export const GET = withSubscription(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const result = providerQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const providers = await listProviders(user.orgId, result.data);
  return NextResponse.json(providers);
});

export const POST = withSubscription(async (request, user) => {
  const body = await request.json();
  const result = createProviderSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const provider = await createProviderWithLicenseAndCredentialing(result.data, user.orgId);
  return NextResponse.json(provider, { status: 201 });
});
