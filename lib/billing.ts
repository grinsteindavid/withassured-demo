export const PRICING = {
  platformFeeCents: 150_000,
  unitPriceCredentialing: 19_900,
  unitPriceLicense: 9_900,
  unitPriceEnrollment: 14_900,
  unitPriceMonitoring: 2_900,
} as const;

export function rollupUsage(params: {
  platformFeeCents: number;
  events: Array<{ type: string; unitCents: number }>;
}) {
  const { platformFeeCents, events } = params;
  const lines = new Map<string, { count: number; unitCents: number; subtotalCents: number }>();

  for (const event of events) {
    const existing = lines.get(event.type) || { count: 0, unitCents: event.unitCents, subtotalCents: 0 };
    lines.set(event.type, {
      count: existing.count + 1,
      unitCents: event.unitCents,
      subtotalCents: existing.subtotalCents + event.unitCents,
    });
  }

  const subtotalCents = Array.from(lines.values()).reduce((sum, line) => sum + line.subtotalCents, 0);
  const totalCents = subtotalCents + platformFeeCents;

  return {
    platformFeeCents,
    lines: Array.from(lines.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      unitCents: data.unitCents,
      subtotalCents: data.subtotalCents,
    })),
    subtotalCents,
    totalCents,
  };
}
