
interface UsageLine {
  type: string;
  count: number;
  unitCents: number;
  subtotalCents: number;
}

interface UsageCardsProps {
  lines: UsageLine[];
  platformFeeCents: number;
  totalCents: number;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export function UsageCards({ lines, platformFeeCents, totalCents }: UsageCardsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {lines.map((line) => (
          <div key={line.type} className="rounded border p-4">
            <p className="text-sm text-gray-500">{line.type.replace(/_/g, " ")}</p>
            <p className="mt-1 text-2xl font-bold">{formatCents(line.subtotalCents)}</p>
            <p className="text-sm text-gray-500">
              {line.count} × {formatCents(line.unitCents)}
            </p>
          </div>
        ))}
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Platform Fee</p>
          <p className="mt-1 text-2xl font-bold">{formatCents(platformFeeCents)}</p>
          <p className="text-sm text-gray-500">Monthly</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded border bg-gray-50 p-4">
        <p className="text-lg font-medium">Total Due</p>
        <p className="text-3xl font-bold text-blue-700">{formatCents(totalCents)}</p>
      </div>
    </div>
  );
}
