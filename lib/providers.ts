import { prisma } from "@/lib/db";
import type { createProviderSchema } from "@/lib/validators";
import type { z } from "zod";

export async function getProviders() {
  return prisma.provider.findMany();
}

export async function createProvider(data: z.infer<typeof createProviderSchema>) {
  return prisma.provider.create({ data });
}
