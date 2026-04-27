import { NextResponse } from "next/server";
import { listProviders, createProviderWithLicenseAndCredentialing } from "@/lib/providers";
import { createProviderSchema, providerQuerySchema } from "@/lib/validators";
import { getSessionUser } from "@/lib/auth";
import { requireActiveSubscription, subscriptionBlockedResponse } from "@/lib/subscription-guard";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasSubscription = await requireActiveSubscription(user.orgId);
  if (!hasSubscription) {
    return subscriptionBlockedResponse();
  }

  const { searchParams } = new URL(request.url);
  const result = providerQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const providers = await listProviders(user.orgId, result.data);
  return NextResponse.json(providers);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasSubscription = await requireActiveSubscription(user.orgId);
  if (!hasSubscription) {
    return subscriptionBlockedResponse();
  }

  const body = await request.json();
  const result = createProviderSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const provider = await createProviderWithLicenseAndCredentialing(result.data, user.orgId);
  return NextResponse.json(provider, { status: 201 });
}
